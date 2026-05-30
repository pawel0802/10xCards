# Spaced Repetition Review (S-04) — Implementation Plan

## Overview

Implement a dedicated spaced-repetition "learning" flow (S-04) with an FSRS-compatible schema, atomic review recording, a scheduler wrapper for ts-fsrs, and a dedicated learning UI. The existing /api/review flow remains for AI candidate generation; the new endpoints live under /api/learning. This plan assumes creating FSRS-ready tables from scratch (no migration of existing cards).

## Current State Analysis

- Research: context/changes/spaced-repetition-review/research.md (see file for detailed findings).
- The repo currently has Supabase auth and flashcard CRUD but uses SM-2 fields (interval_days/ease_factor/repetitions). No server-side ts-fsrs integration or transactional review endpoint exists.
- Frontend has AI candidate review UI (src/components/ReviewFlashcards.tsx) but no SR session UI.

## Desired End State

- DB: flashcards and review_logs using FSRS fields (state, stability, difficulty, reps, lapses, last_review) and optimizer-ready review_logs (rating, elapsed_days, scheduled_days, prior_state).
- Server: atomic review RPC (public.record_review) or equivalent transaction; Cloudflare Worker-compatible scheduler wrapper that runs ts-fsrs logic (with Node fallback if incompatible).
- API: GET /api/learning/due?limit=10 and POST /api/learning/review to submit ratings.
- Frontend: /learning page with SpacedReview component (10-card session, 4-point rating, require rating, block advance on submit failure).

## Key Discoveries

- Current DB schema and types are SM-2 oriented (research.md lines 47-58).
- No transactional review API exists (research.md lines 59-66).
- Frontend flow currently supports AI candidate acceptance, not spaced repetition sessions (research.md 68-70).
- Application is not production; creating FSRS tables from scratch is acceptable (confirmed by stakeholder).

## What We're NOT Doing

- Not converting or migrating existing SM-2 cards.
- Not storing generator_parameters per-card in MVP.
- Not implementing offline sync in MVP.

## Implementation Approach

- Create fresh FSRS-ready tables via a new migration (supabase/migrations/20260601_create_fsrs.sql).
- Add RLS and minimal per-operation policies on new tables.
- Implement a DB RPC `public.record_review(...)` that locks the flashcard row, calls scheduler logic server-side (ts-fsrs integration), updates flashcard fields, and inserts a review_log atomically.
- Implement GET /api/learning/due and POST /api/learning/review endpoints in the server code (zod-validated inputs).
- Implement src/lib/services/review.ts and a scheduler wrapper compatible with Cloudflare Workers; include a test for ts-fsrs bundling—fallback to Node serverless if incompatible.
- Frontend: new page src/pages/learning.astro mounting src/components/SpacedReview.tsx (client:load). Session fetches 10 cards and enforces rating before advancing.

## Critical Implementation Details

- RLS: new tables must enable RLS with policies restricting access to the owner (auth.uid()).
- Atomicity: RPC should use FOR UPDATE semantics or run in a single transaction to avoid races.
- ts-fsrs runtime: early compatibility test for Cloudflare Workers is mandatory; include a fallback path to Node serverless to avoid blocking deployment.
- Global FSRS parameters: store in server config/env (not per-card) as decided.
- Rating mapping: UI uses 4-point scale (1=Again,2=Hard,3=Good,4=Easy) mapped to ts-fsrs ratings in server wrapper.

## Phase 1: DB & Types

### Overview
Create FSRS-ready schema and server-side RPC.

### Changes Required:

#### 1. DB migration
**File**: `supabase/migrations/20260601_create_fsrs_flashcards_and_review_logs.sql`
**Intent**: Create tables `public.flashcards` and `public.review_logs` with FSRS fields, enable RLS, add policies, and implement RPC `public.record_review(...)` for atomic reviews. RPC subtask (explicit): define RPC signature and DTOs; implement strict input validation inside the function (validate user_id, flashcard_id, rating, optional idempotency_key); implement SECURITY DEFINER function body that performs the atomic update/insert (SELECT ... FOR UPDATE semantics or equivalent), enforcing `auth.uid()` checks; add a minimal RLS policy allowing only the RPC to bypass row-level checks while the function enforces authorization; and schedule a security audit / PR checklist item to review the function body and policies before merging. If SECURITY DEFINER is disallowed, fall back to a server-side transaction using the service-role key and document the secret handling steps.
**Contract**: flashcards fields: id, user_id, front, back, source, due_date (timestamptz), state (smallint), stability (numeric), difficulty (numeric), reps (integer), lapses (integer), last_review (timestamptz), created_at, updated_at. review_logs fields: id, user_id, flashcard_id, rating (smallint), prior_state (jsonb), elapsed_days (numeric), scheduled_days (numeric), reviewed_at (timestamptz).

### Success Criteria
#### Automated
- Migration file exists and `supabase db push` / migrate applies in staging
- RLS policies present and linted
#### Manual
- Run RPC for a test user; flashcard row updates and corresponding review_log inserted atomically

## Phase 2: Server — Scheduler & API

### Overview
Implement scheduler wrapper, review service, and API endpoints.

### Changes Required:

#### 0. Scheduler compatibility smoke test
**Intent**: Bundle ts-fsrs for Cloudflare Workers (esbuild/rollup + polyfills) and run a smoke test in a Worker dev/runtime. Record the result; if incompatible, document Node serverless fallback (deployment steps and service-key handling). This task gates Phase 2: proceed with Phase 2 work only after the compatibility test is recorded.

#### 1. Scheduler wrapper
**File**: `src/lib/scheduler.ts`
**Intent**: Small wrapper that maps DB row ↔ ts-fsrs Card, maps 4-point rating to ts-fsrs rating, calls scheduler.next(card, now, rating), and returns the new state to persist.
**Contract**: export `applyRating(cardRow, ratingNumber): Promise<{updatedFlashcardFields, reviewLogEntry}>`.

#### 2. Review service
**File**: `src/lib/services/review.ts`
**Intent**: getDueFlashcards(userId, limit=10) and submitReview(userId, flashcardId, rating).
**Contract**: submitReview must call RPC `public.record_review` (preferred) or perform SELECT ... FOR UPDATE + scheduler wrapper + update + insert in a transaction. The RPC/service MUST implement server-side deduplication: if a review for the same user+flashcard exists within a configurable short window (default 5s), return the existing result instead of applying scheduler.next again. Document the dedupe window and expected behavior in the API contract.

#### 3. API endpoints
**Files**: `src/pages/api/learning/due.ts` (GET), `src/pages/api/learning/review.ts` (POST)
**Intent**: GET returns up to `limit` due cards (default 10); POST validates body (`{flashcardId, rating}`), authenticates user, and calls service.submitReview.

### Success Criteria
#### Automated
- Unit tests for scheduler wrapper deterministic
- API endpoints pass basic integration tests
#### Manual
- End-to-end: load /learning, fetch cards, submit rating, DB rows change as expected

## Phase 3: Frontend — Learning UI

### Overview
Add dedicated /learning page and SpacedReview component.

### Changes Required:

#### 1. SpacedReview component
**File**: `src/components/SpacedReview.tsx`
**Intent**: Client component that fetches `/api/learning/due?limit=10` on mount, displays front/back, 4 rating buttons, disables advance until POST succeeds; on POST failure show error and allow manual retry.
**Contract**: Uses `fetch` with JSON, handles 409/5xx with user-visible message; no skipping allowed.

#### 2. Page
**File**: `src/pages/learning.astro`
**Intent**: Mount SpacedReview (client:load) and require authentication (middleware ensures user).

### Success Criteria
#### Automated
- Component unit tests for UI state transitions
#### Manual
- Manual smoke: load /learning, complete a small session of 10 cards, confirm DB updates and progression

## Testing Strategy

### Unit
- scheduler.applyRating deterministic tests (seeded card -> ratings -> expected stability/difficulty)
- service.submitReview mocks DB RPC and ensures proper contract

### Integration
- Create test user, seed 3 cards due, call POST flows, assert flashcard and review_log changes.

### RLS
- Tests to ensure other users cannot read/modify test user's flashcards/review_logs

## Performance Considerations

- Batch size default: 10 cards per session (configurable via query param). Limit network payloads and CPU per request.
- RPC is single-row transactional; if high concurrency expected, add queueing or rate limits.

## Migration Notes

- Because this is a fresh FSRS rollout, create new tables from scratch. If later converting live data, add a non-destructive migration plan.

## References

- Research: `context/changes/spaced-repetition-review/research.md`
- Existing AI review UI: `src/components/ReviewFlashcards.tsx`

## Progress

### Phase 1: DB & Types
#### Automated
- [x] 1.1 Create migration file `supabase/migrations/20260601_create_fsrs_flashcards_and_review_logs.sql`
- [x] 1.2 Add RLS policies and implement RPC `public.record_review` with signature & validation; schedule security audit
- [x] 1.3 Update `src/types.ts` to FSRS types
#### Manual
- [ ] 1.4 Verify RPC atomicity with staging test user

### Phase 2: Server
#### Automated
- [x] 2.0 Run ts-fsrs compatibility test in Worker runtime
- [x] 2.1 Implement `src/lib/scheduler.ts` wrapper and unit tests
- [x] 2.2 Implement `src/lib/services/review.ts` and unit tests
- [x] 2.3 Add API endpoints `GET /api/learning/due` and `POST /api/learning/review`
#### Manual
- [ ] 2.4 End-to-end API smoke test

### Phase 3: Frontend
#### Automated
- [x] 3.1 Add `src/components/SpacedReview.tsx` unit tests
- [x] 3.2 Add page `src/pages/learning.astro`
#### Manual
- [ ] 3.3 Manual session smoke test (10 cards)

### Phase 4: Tests & Deploy
#### Automated
- [ ] 4.1 Integration tests (DB + RLS)
- [ ] 4.2 CI updated to run SR tests
- [ ] 4.3 Add scheduler health-check endpoint and basic logging
#### Manual
- [ ] 4.4 Staging verification and monitoring checks


---

*Plan generated from research.md; ready to iterate on technical details or scope.*
