# Spaced Repetition Review Implementation Plan

## Overview

Implement S-04: server-side integration of the ts-fsrs scheduler to provide canonical spaced-repetition review. Deliverables: DB schema (flashcards + review_logs) with RLS, server-side endpoints to fetch due cards and record reviews, service wiring (generator_params as JSONB), minimal client wiring for review sessions (10 cards per fetch), CI bundling verification for Cloudflare Workers, and a minimal test surface and migration/run checklist.

This plan follows the existing research (context/changes/spaced-repetition-review/research.md) and the clarifications you provided (store generator_params as JSONB, rating mapping 0-3, delete existing cards, synchronous server-side scheduling in a DB transaction, 10 cards per fetch, minimal tests).

## Current State Analysis

- ts-fsrs available and TypeScript-friendly: context/changes/spaced-repetition-review/ts-fsrs-docs.md
- Codebase has Supabase client and middleware: src/lib/supabase.ts, src/middleware.ts
- Flashcard save flow and service do not persist SR fields: src/pages/api/save-flashcards.ts, src/lib/services/flashcards.ts
- Review UI island and review page exist: src/components/ReviewFlashcards.tsx, src/pages/review.astro

### Key Discoveries

- ts-fsrs exposes repeat()/next() and generatorParameters() (see ts-fsrs-docs.md)
- Current flashcards schema lacks SR columns and generator_params (see research references)
- There is a working ReviewFlashcards React island that can be adapted for fetching and rating

## Desired End State

- Flashcards table contains SR fields and stable JSONB generator_params.
- GET /api/review/due returns due cards for the authenticated user (10 per fetch).
- POST /api/flashcards/:id/review synchronously computes scheduler.next(), updates flashcard SR fields in a single DB transaction, and inserts a review_log row.
- Review UI fetches due cards, shows them, and posts rating (0-3). Minimal unit/integration tests exist; migrations applied; bundling on Cloudflare Workers verified.

## What We're NOT Doing

- Client-only/offline scheduler (out of scope for S-04 MVP).
- Full load/perf benchmarking and complex infra (out of scope; monitor in follow-ups).
- S-01 AI model/provider choice (separate change).

## Implementation Approach

Server-side scheduling (synchronous): client fetches due cards → user rates card → POST /api/flashcards/:id/review → server rehydrates card using generator_params (JSONB) or fields, calls scheduler.next(), updates flashcards and inserts review_log inside one DB transaction, returns updated card/log.

Reasoning: consistent canonical schedule, RLS enforced, multi-device sync. Tradeoffs: request CPU & latency per rating; monitor and optimize later.

## Critical Implementation Details

- Data deletion: per user decision, all existing flashcards will be deleted during migration. **Before deletion, create a guaranteed export/backup and a communication plan.**
- Storage: use `generator_params jsonb` on flashcards to store ts-fsrs serialization (research + your selection).
- Ratings: store as smallint 0..3 (0=Again,1=Hard,2=Good,3=Easy).
- Concurrency: perform updates inside a DB transaction with SELECT ... FOR UPDATE to avoid races.
- Interval unit: store `interval_days` as integer days (round nearest day).
- Review logs: keep full review_logs (with generator_params_before/after) for 1 year, then archive to cheaper storage.
- Cloudflare Workers: target Workers runtime; add any necessary polyfills/shims and CI bundling verification step.

## Phase 1: Migrations, types, & data handling

### Overview
Create DB schema and types, enable RLS and policies, backup existing data, then (per your decision) remove existing flashcards. Add types to src/types.ts and update save-flashcards to initialize generator_params.

### Changes Required

#### 1. Migration SQL
**File**: `supabase/migrations/YYYYMMDDHHmmss_add_flashcards_and_review_logs.sql`

**Intent**: Add `flashcards` and `review_logs` tables with fields from research (id, user_id, front, back, state, ease_factor, interval_days, repetition, due_at, generator_params jsonb, created_at, updated_at) and `review_logs` storing ratings and prev/new values.

**Contract**: Ensure RLS enabled and policies grant authenticated users access only to their rows. Provide explicit migration steps to export and then TRUNCATE existing `flashcards` if confirmed.

### Success Criteria

#### Automated Verification:
- Migration SQL exists at `supabase/migrations/..._add_flashcards_and_review_logs.sql`
- `npm run typecheck` passes after adding types

#### Manual Verification:
- Backup/export file available in `supabase/backups/` before deletion
- DB schema reflects new columns and RLS policies are active

---

## Phase 2: Backend — scheduler integration & API

### Overview
Install ts-fsrs, implement GET /api/review/due and POST /api/flashcards/:id/review, update `src/lib/services/flashcards.ts` to read/write SR fields.

### Changes Required

#### 1. Endpoint: GET /api/review/due
**File**: `src/pages/api/review/due.ts`

**Intent**: Return up to 10 due cards for the authenticated user: `SELECT * FROM flashcards WHERE user_id = $1 AND due_at <= now() ORDER BY due_at ASC LIMIT 10`.

**Contract**: Response: [{ id, front, back, ease_factor, interval_days, repetition, due_at, generator_params }]

#### 2. Endpoint: POST /api/flashcards/[id]/review
**File**: `src/pages/api/flashcards/[id]/review.ts`

**Intent**: Authenticate user, fetch card row inside transaction (FOR UPDATE), rehydrate scheduler using generator_params or field mapping, call scheduler.next(rehydratedCard, now, rating), persist updated SR columns and generator_params, insert review_logs.

**Contract**: Body { rating: number(0..3) } → returns updated card and review_log object.

**Implementation note**: Use the TS skeleton from research as a starting point (context/changes/spaced-repetition-review/research.md lines ~78-95). Wrap DB update and review_log insert in a single transaction. Use smallint for rating.

### Success Criteria

#### Automated
- Endpoint files exist and compile
- Basic service unit tests for scheduler integration pass

#### Manual
- Manual review session: submit rating and observe DB changes (flashcards SR fields updated and review_log inserted)

---

## Phase 3: UI — Review island wiring

### Overview
Update `ReviewFlashcards.tsx` to fetch 10 cards via GET /api/review/due and post ratings as 0..3 integers. Ensure `save-flashcards` initializes generator_params on card creation.

### Changes Required

**File**: `src/components/ReviewFlashcards.tsx`

**Intent**: Fetch due cards page, render card UI, map user actions to rating integers, POST to review endpoint, update UI state on success.

**Contract**: Use existing UI patterns and `cn()` for class merging. Keep React island minimal client-side logic.

### Success Criteria

#### Manual
- Manual test: user's review flows through UI; DB flashcard row and review_log update as expected

---

## Phase 4: CI, bundling, tests, rollout

### Overview
Add CI job to verify bundling for Cloudflare Workers, add minimal unit/integration tests, perform migration in staging, run backup & deletion, then deploy to production.

### Changes Required

- CI: `.github/workflows/ci.yml` add step to `npm run build` and smoke-run bundling target for Workers.
- Tests: Add unit tests for `flashcards` service and integration test for review endpoint.
- Rollout steps: create backup/export, run migration in staging, run smoke tests, truncate existing flashcards (per decision), release.

### Success Criteria

#### Automated
- CI passes with bundling verification for Workers
- Unit/integration tests pass locally and in CI

#### Manual
- Staging migration completed and verified
- Production migration + deletion executed after stakeholder sign-off

---

## Testing Strategy

Per your choice: minimal testing surface.
- Unit tests: flashcards service (rehydration, scheduler.next mapping, DB update logic)
- Integration test: POST /api/flashcards/:id/review happy-path
- Manual QA: run a review session in staging and verify DB changes

## Performance Considerations

- Synchronous scheduler.next() inside request increases CPU per rating. Monitor CPU and latency and consider moving to async if scaling pain appears.
- Transactional updates can cause contention on hot flashcards. Monitor PG locks under load.

## Migration Notes

- BEFORE migration: export existing `flashcards` and `review_logs` to `supabase/backups/YYYYMMDD_flashcards_backup.sql` and/or CSV.
- Per your decision: delete existing cards. Implement migration that truncates `flashcards` and `review_logs` after backup and stakeholder sign-off.
- Ensure RLS policies added in same migration file and test with staging accounts.

## References

- Research doc: `context/changes/spaced-repetition-review/research.md`
- TS skeleton: see research.md lines ~78-95
- Code refs: src/pages/api/save-flashcards.ts, src/lib/services/flashcards.ts, src/components/ReviewFlashcards.tsx, src/pages/review.astro

## Progress

### Phase 1: Migrations, types, & data handling

#### Automated
- [ ] 1.1 Create migration SQL at `supabase/migrations/*_add_flashcards_and_review_logs.sql`
- [ ] 1.2 Add types in `src/types.ts` and run `npm run typecheck`

#### Manual
- [ ] 1.3 Backup/export existing flashcards to `supabase/backups/` and obtain sign-off
- [ ] 1.4 Run migration and (per sign-off) delete existing flashcards

### Phase 2: Backend — scheduler integration & API

#### Automated
- [ ] 2.1 Implement GET /api/review/due and POST /api/flashcards/:id/review and unit tests

#### Manual
- [ ] 2.2 Manual verification of review flow and DB changes

### Phase 3: UI — Review island wiring

#### Manual
- [ ] 3.1 Manual QA: review session works end-to-end (10 cards fetch, rating posts)

### Phase 4: CI, bundling, tests, rollout

#### Automated
- [ ] 4.1 CI bundling verification for Cloudflare Workers
- [ ] 4.2 Minimal unit/integration tests in CI

#### Manual
- [ ] 4.3 Staging migration verification and production rollout

---

If this plan looks correct, the next step is to implement Phase 1: create the migration file and add types. Run `npm run typecheck` and create the backup export before truncating flashcards. Use `/10x-implement spaced-repetition-review phase 1` to begin implementation (suggested command copied to clipboard after plan creation).
