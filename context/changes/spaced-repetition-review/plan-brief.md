# Spaced Repetition Review — Plan Brief

> Full plan: `context/changes/spaced-repetition-review/plan.md`
> Research: `context/changes/spaced-repetition-review/research.md`

## What & Why

Add server-side spaced-repetition reviews (S-04) using the ts-fsrs scheduler to provide consistent, multi-device-synced review scheduling and durable audit logs. This enables reliable review timing and analytics while keeping algorithm state server-side.

## Starting Point

- Repo has Supabase client/middleware and a ReviewFlashcards React island.
- Existing flashcard model lacks SR columns; save flow doesn't persist scheduler state (see research.md).

## Desired End State

- Flashcards table includes SR columns and `generator_params` JSONB.
- Server endpoints: GET /api/review/due (10 cards) and POST /api/flashcards/:id/review (sync scheduler.next inside transaction).
- UI fetches due cards and posts ratings (0..3); minimal tests and CI bundling check for Workers.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---:|---|---|
| Scheduler location | Server-side, synchronous in POST handler | Consistent canonical schedule and multi-device sync | Research + Plan |
| generator_params storage | JSONB `generator_params` | Flexible, stores full ts-fsrs state for reproducibility | Research |
| Rating mapping | Integer 0..3 (0=Again..3=Easy) | Matches ts-fsrs enum and stores compactly | Plan (you) |
| Existing data | Delete all existing flashcards (after backup) | Simplifies migration and state reset per your decision | Plan (you) |
| Interval unit | Integer days (rounded) | Simple and human-friendly | Plan (you) |
| Fetch batch size | 10 cards | Short, manageable review sessions | Plan (you) |
| Review logs retention | 1 year then archive | Audit trail without indefinite storage growth | Plan (you) |

## Scope

**In scope:** DB migrations (flashcards + review_logs + RLS), ts-fsrs install & server integration, GET/POST review APIs, UI wiring for review island, CI bundling verification, backups and deletion of existing cards.

**Out of scope:** Client-only/offline scheduling, S-01 AI provider selection, full-scale perf benchmarking.

## Architecture / Approach

Server-side request-response model: clients request due cards, server computes and returns them; when users rate a card, POST handler runs scheduler.next() synchronously inside a DB transaction to update flashcard SR fields and insert a review log. `generator_params` is persisted as JSONB so the scheduler state is restorable.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Migrations & types | DB schema, types, backup + deletion | Data loss risk if backup missing |
| 2. Backend | Review endpoints + scheduler integration | Request latency & Workers bundling risk |
| 3. UI | Review island integration (10 cards) | UX bugs in rating mapping |
| 4. CI & Rollout | Bundling checks, tests, staging rollout | Migration mistakes on production |

**Prerequisites:** Access to DB for backups, Supabase migration tooling, CI permission to add a bundling job. 
**Estimated effort:** ~1–2 developer-weeks (1 engineer) for MVP implementation and staging rollout.

## Open Risks & Assumptions

- ts-fsrs may require shims for Cloudflare Workers; plan includes CI bundling verification and fallbacks.
- Deleting all existing flashcards is irreversible — backup and stakeholder sign-off required.
- Synchronous per-rating computation increases server CPU; monitor and consider async offload if needed.

## Success Criteria (Summary)

- GET /api/review/due returns due cards (10) for authenticated users.
- POST /api/flashcards/:id/review updates SR fields in a single transaction and inserts a review_log.
- Review UI successfully fetches and posts ratings; staging migration completed and production rollout executed after sign-off.
