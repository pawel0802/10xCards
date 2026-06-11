---
date: 2026-05-30T19:14:43.377+02:00
researcher: Copilot
git_commit: 43e6c11cbcb205a334407d31529ee55dd5973e09
branch: main
repository: pawel0802/10xCards
topic: "Compatibility of ts-fsrs-docs-review.md with the codebase; implementing S-04 (spaced-repetition-review)"
tags: [research, fsrs, spaced-repetition, supabase, migration, s-04]
status: complete
last_updated: 2026-05-30
last_updated_by: Copilot
---

# Research: Compatibility of ts-fsrs-docs-review.md with codebase & S-04 implementation

**Date**: 2026-05-30T19:14:43.377+02:00
**Researcher**: Copilot
**Git Commit**: 43e6c11cbcb205a334407d31529ee55dd5973e09
**Branch**: main
**Repository**: pawel0802/10xCards

## Research Question

Is context/foundation/ts-fsrs-docs-review.md compatible with this codebase, and what is required to implement S-04 (spaced-repetition-review) taking into account the Supabase schema changes proposed in context/foundation/supabase-changes.md?

## Verdict (short)

Partial compatibility. The repository contains foundational pieces (Supabase auth + flashcard CRUD, UI scaffolding), but the current data model, types, and UI align with an SM-2-style schema (interval_days / ease_factor / repetitions). Implementing S-04 as described in the FSRS document requires: schema additions (FSRS fields), a DB RPC or transactional review endpoint (SELECT ... FOR UPDATE), server-side integration with ts-fsrs (scheduler.next), TypeScript type updates, and a dedicated SR UI and endpoints. See the detailed findings and tasks below.

## Summary (one-paragraph)

The TS-FSRS review document correctly identifies key invariants for integrating ts-fsrs: keep generator parameters global (not per-card), store only per-card state (stability, difficulty, reps, lapses, last_review, due), and persist review logs suitable for optimizer training (rating, elapsed_days, scheduled_days, state). The codebase currently stores SM-2 fields in DB and types (interval_days, ease_factor, repetitions) and lacks server-side code that runs ts-fsrs in a transaction. The migration in context/foundation/supabase-changes.md already recommends the right FSRS schema; the work needed is to align code and add the transactional plumbing and UI.

## Key references (repo-relative and permalinks)

- ts-fsrs guidance (doc): context/foundation/ts-fsrs-docs-review.md (see recommendations and examples). Permalink: https://github.com/pawel0802/10xCards/blob/43e6c11cbcb205a334407d31529ee55dd5973e09/context/foundation/ts-fsrs-docs-review.md
- Roadmap S-04 description: context/foundation/roadmap.md (S-04 — spaced-repetition-review). Permalink: https://github.com/pawel0802/10xCards/blob/43e6c11cbcb205a334407d31529ee55dd5973e09/context/foundation/roadmap.md
- Current DB migrations (SM-2 fields): supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql:29-34,68-74. Permalink: https://github.com/pawel0802/10xCards/blob/43e6c11cbcb205a334407d31529ee55dd5973e09/supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql
- Recommended FSRS migration (doc): context/foundation/supabase-changes.md. Permalink: https://github.com/pawel0802/10xCards/blob/43e6c11cbcb205a334407d31529ee55dd5973e09/context/foundation/supabase-changes.md
- Types with SM-2 fields: src/types.ts:14-17
- Save new cards endpoint (no FSRS seeding): src/pages/api/save-flashcards.ts:41-47
- Flashcard service (no due filtering): src/lib/services/flashcards.ts:11-23
- AI candidate review UI (not SR): src/components/ReviewFlashcards.tsx:15-23,58-62

## Detailed findings and mismatches (file:lines)

1) DB schema uses SM-2 fields rather than FSRS fields
- supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql:29-34 — defines interval_days, ease_factor, repetitions. ts-fsrs needs stability, difficulty, reps, lapses, last_review. (Mismatch)

2) review_logs lacks optimizer fields
- supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql:68-74 — current review_logs contains rating & reviewed_at only. FSRS optimizer needs state, elapsed_days, scheduled_days (or similar). (Mismatch)

3) updated_at trigger used — last_review must be separate
- supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql:9-17,56-59 — handle_updated_at updates updated_at on any update. ts-fsrs doc warns against using updated_at as last_review. Add last_review column. (Mismatch)

4) Types still SM-2 oriented
- src/types.ts:14-17 — Flashcard includes interval_days/ease_factor/repetitions. Update to FSRS fields (state, stability, difficulty, reps, lapses, last_review). (Mismatch)

5) No server-side ts-fsrs integration / no transactional review API
- repo search: no server files reference 'fsrs' or a review transactional endpoint. There is no POST /api/review that runs scheduler.next() inside a DB transaction (SELECT ... FOR UPDATE). (Missing)

6) save-flashcards inserts new cards without FSRS defaults
- src/pages/api/save-flashcards.ts:41-47 — inserted rows only include user_id, front, back, source; generator_params / FSRS fields are not initialized. (Issue)

7) No dedicated endpoint to fetch due cards (getDueFlashcards)
- src/lib/services/flashcards.ts:11-23 — getFlashcards returns paginated list ordered by created_at. There's no getDueFlashcards or API GET /api/review/due. (Missing)

8) Frontend review UI is AI-candidate flow, not a spaced-repetition session
- src/components/ReviewFlashcards.tsx:15-23,58-62 — this component handles candidate acceptance and saving; it does not implement SR rating submission or call a review API. (Mismatch)

## Concrete required changes (grouped)

DB (priority: high)
- Add FSRS fields to flashcards (non-destructive): state (smallint), stability (numeric), difficulty (numeric), reps (integer), lapses (integer), last_review (timestamptz). Keep due_date.
- Extend review_logs with state, elapsed_days, scheduled_days (and optionally prev/new snapshots for generator_params if you want optimizer training data).
- Provide a safe migration that adds columns (nullable/defaults), backfills reps from repetitions, and does not drop legacy columns yet. See supabase/migrations/20260601_add_fsrs_columns.sql (proposed) for exact SQL and an RPC record_review function to atomically apply reviews.

Server / API (priority: critical)
- Add POST /api/review endpoint (or src/pages/api/flashcards/[id]/review.ts) that:
  - Validates input with zod (flashcard_id, rating)
  - Loads the flashcard row with FOR UPDATE (transaction) or calls a DB RPC with a row lock
  - Maps DB row -> ts-fsrs Card, maps client rating to ts-fsrs Rating
  - Calls scheduler.next(card, now, rating)
  - Persists result atomically (update flashcards, insert review_logs) — use RPC or a server-side PG transaction
- Add GET /api/review/due to fetch due cards (due_date <= now) and a service wrapper src/lib/services/review.ts
- On insertion of new cards (save-flashcards), optionally seed generator_params (JSON) with scheduler.generatorParameters() if you choose to persist generator params per-card for reproducibility. The docs recommend NOT storing generator_parameters per card unless necessary; prefer global parameters or per-user settings. If storing generator_params, keep them small and JSON-serializable.

Types (priority: high)
- Update src/types.ts to reflect FSRS fields:
  - Flashcard: id, user_id, front, back, source, due_date, state, stability, difficulty, reps, lapses, last_review, created_at, updated_at
  - ReviewLog: id, user_id, flashcard_id, rating(1..4), state (prior), elapsed_days, scheduled_days, reviewed_at
- Keep DTOs for user-editable fields (exclude SR internal fields from public update DTOs)

Frontend (priority: medium)
- Add SpacedReview UI component (src/components/SpacedReview.tsx) that:
  - Calls GET /api/review/due to load due cards
  - Shows card front/back and 4 rating buttons (1: Again, 2: Hard, 3: Good, 4: Easy)
  - Posts rating to POST /api/review and advances through the session on success
- Update src/pages/review.astro to mount the new SR component (client:load)
- Keep existing ReviewFlashcards (AI candidate review) as separate flow (rename or provide a toggle between 'AI candidate review' vs 'SR session')

Operational / infra
- Decide where GLOBAL_FSRS_PARAMETERS live: code config (recommended for MVP) or per-user settings (DB table user_settings) if you plan per-user tuning
- If using Supabase RPC with SECURITY DEFINER, plan careful access control & audit

## Proposed change-id and repository location

- change-id: spaced-repetition-review
- folder: context/changes/spaced-repetition-review/
  - research.md (this file)
  - plan.md (to be created next)
  - patches/ (optional: for proposed diffs)

## Proposed migration (summary)

Create a non-destructive migration (example path: supabase/migrations/20260601_add_fsrs_columns.sql) that:
- Alters public.flashcards to add state, stability, difficulty, reps, lapses, last_review (nullable/defaults)
- Alters public.review_logs to add state, elapsed_days, scheduled_days
- Adds a server-side RPC `public.record_review(...)` that locks the row (SELECT ... FOR UPDATE), updates the flashcard state, and inserts a review_log atomically
- Backfill basic fields (e.g., copy repetitions -> reps) — do not attempt automatic semantic conversion from ease_factor/interval_days

(Exact SQL snippet is present in the research artifact and in the change plan drafts.)

## Prioritized todos (actionable)

1. db-add-fsrs-columns — Add FSRS columns & record_review RPC (create migration file, deploy to staging, verify RLS)
2. types-update — Update TypeScript types to FSRS model (src/types.ts)
3. service-get-due — Implement getDueFlashcards service (src/lib/services/review.ts)
4. api-review — Add POST /api/review endpoint that runs ts-fsrs and persists atomically
5. api-due — Add GET /api/review/due endpoint
6. frontend-spaced-review — Add SpacedReview UI and wire into review page
7. integration-tests — Create integration tests for the review flow and RLS
8. cleanup-legacy-columns — After verification, drop legacy SM-2 columns (interval_days, ease_factor, repetitions)

## Risks & mitigations

- Race conditions / data corruption: Use RPC with SELECT ... FOR UPDATE or server transaction with a privileged DB connection. Test concurrency on staging.
- Semantic migration risk: Do not auto-convert ease_factor/interval_days into stability/difficulty without manual verification. Keep legacy columns until you validate.
- Security: RPCs with SECURITY DEFINER require strict validation and policy enforcement; prefer server-bound transactions where possible.
- Dependency runtime: ts-fsrs must be compatible with the server runtime (Cloudflare Workers vs Node). If not compatible, run scheduling server-side in Node or via a Lambda-style worker.

## Open questions

1. Where should FSRS parameters live (global config vs per-user)?
2. Will the team accept SECURITY DEFINER RPCs in Supabase or prefer server-side transactions with the service key?
3. Do we want automated conversion logic from SM-2 fields to FSRS fields, or manual reinitialization is acceptable for existing users?
4. Should generator_parameters be stored per-card for full reproducibility, or kept global/per-user to save DB space?

## Testing & verification checklist

- Unit tests for the scheduler wrapper that given a card input and a rating sequence, produce deterministic expected changes (stability/difficulty/due)
- Integration test: create a test user and a card, call POST /api/review multiple times with sample ratings, assert flashcards row updated and review_logs inserted with elapsed_days/scheduled_days
- RLS tests: confirm other users cannot access or modify the test user's flashcards/review_logs
- UI smoke test: load /review, fetch due cards, submit a rating, confirm UI advances and DB updates correctly

## Conclusion

The codebase is partially ready: authentication, Supabase client scaffolding, flashcard CRUD, and front-end scaffolding exist. The main missing pieces for S-04 are schema alignment with FSRS, a transactional server-side review implementation (or an RPC), and a spaced-repetition UI. The proposed migration + RPC pattern is the lowest-risk approach to ensure atomic updates and enable optimizer-friendly logging. Next step: create plan.md and proposed patches (types, API, migration).


---

*Generated by Copilot research agent — references and file-level notes available in the repository under the change folder.*
