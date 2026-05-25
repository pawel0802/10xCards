# Flashcard Data Schema — Plan Brief

> Full plan: `context/changes/flashcard-data-schema/plan.md`

## What & Why

Define the foundational PostgreSQL tables (`flashcards` + `review_logs`) in Supabase with full Row Level Security and TypeScript types in `src/types.ts`. This is Foundation F-01 — the data model every other roadmap slice (AI generation, manual creation, card management, spaced repetition) depends on. Without it, no feature can be built.

## Starting Point

No Supabase migrations exist; `supabase/migrations/` must be created. `src/types.ts` is absent. Auth is fully wired (`src/lib/supabase.ts` + `src/middleware.ts`), so `auth.uid()` is available in RLS policies today.

## Desired End State

After this change, a single SQL migration applies cleanly via `npx supabase db push` to the hosted project (`ienydkltkzzxsxvtquxe.supabase.co`). Both tables exist with correct columns, RLS enabled and enforced (anonymous access blocked), and `src/types.ts` exports clean TypeScript entity types and DTO types that all future API routes import from.

## Key Decisions Made

| Decision                 | Choice                                                                      | Why (1 sentence)                                                                                     | Source         |
| ------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------- |
| Card face column names   | `front` / `back`                                                            | Generic flashcard standard (Anki, Quizlet); not Q&A-specific, supports all card types                | Plan           |
| SR scheduling columns    | Include in F-01 (`due_date`, `interval_days`, `ease_factor`, `repetitions`) | Roadmap flags risk: "SR columns up-front prevents costly ALTER TABLE in S-04"                        | Roadmap / Plan |
| SR scheduling model      | SM-2 compatible (4 columns)                                                 | Baseline that works with both SM-2 and ts-fsrs; S-04 can add FSRS-specific columns via new migration | Plan           |
| Review rating type       | `smallint CHECK (1–4)`                                                      | 1=Again/2=Hard/3=Good/4=Easy maps cleanly to both SM-2 grades and FSRS ratings                       | Plan           |
| TypeScript types         | Hand-written in `src/types.ts`                                              | AGENTS.md hard rule: no `supabase gen types`                                                         | AGENTS.md      |
| Source tracking          | `source text NOT NULL DEFAULT 'manual' CHECK ('ai', 'manual')`              | PRD secondary success criterion: ≥ 75% of cards from AI — must be measurable                         | PRD / Plan     |
| `review_logs` mutability | INSERT + SELECT only (no UPDATE/DELETE policies)                            | Immutable audit trail; aligns with double-entry ledger pattern for review history                    | Plan           |
| Deletes                  | Hard delete on `flashcards`                                                 | MVP simplicity; no PRD requirement for undo/history                                                  | Plan           |
| Migration atomicity      | Single file for both tables                                                 | AGENTS.md hard rule: RLS must be in the same file as `CREATE TABLE`                                  | AGENTS.md      |

## Scope

**In scope:**

- `supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql`
- `flashcards` table with SR scheduling columns, source tracking, RLS (4 policies), `updated_at` trigger
- `review_logs` table with RLS (2 policies — SELECT + INSERT only)
- Performance indexes on `user_id`, `(user_id, due_date)`, `flashcard_id`
- `src/types.ts` — `Flashcard`, `ReviewLog`, `FlashcardCreateDto`, `FlashcardUpdateDto`, `ReviewLogCreateDto`

**Out of scope:**

- FSRS-specific columns (`stability`, `difficulty`, `state`, `lapses`) — S-04 migration
- Tags, decks, categories — PRD Non-Goals
- Soft deletes, `deleted_at` column
- `supabase gen types` — hand-written types only
- Remote `supabase db push` — out of scope for this change (deployment concern)
- Seed data

## Architecture / Approach

Two-table schema under `public` schema. `flashcards` is user-owned content (full CRUD via RLS). `review_logs` is an append-only ledger (INSERT + SELECT only via RLS). Both tables reference `auth.users(id)` via `user_id uuid`. The `updated_at` trigger fires on every UPDATE to `flashcards` (review_logs are immutable so no trigger needed). All RLS policies use `auth.uid() = user_id` predicate — compatible with the SSR cookie-based auth established in `src/middleware.ts`.

## Phases at a Glance

| Phase               | What it delivers                                           | Key risk                                                                       |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1. SQL Migration    | Both tables, RLS, indexes, trigger — applied via `db push` | Requires `SUPABASE_ACCESS_TOKEN` or `npx supabase login` before linking        |
| 2. TypeScript Types | `src/types.ts` with entity + DTO types                     | Type drift from schema — mitigate by reviewing against migration after writing |

**Prerequisites:** `SUPABASE_ACCESS_TOKEN` in environment (or `npx supabase login`); `npx supabase link --project-ref ienydkltkzzxsxvtquxe` run once  
**Estimated effort:** ~1 session; 2 phases, straightforward implementation

## Open Risks & Assumptions

- **ts-fsrs vs SM-2 library choice (S-04)**: If S-04 selects FSRS, a new migration will add `stability`, `difficulty`, `state`, `lapses` columns to `flashcards`. The SM-2 columns from F-01 remain as they are compatible with FSRS's state tracking. No rework needed for F-01 in either case.
- **SUPABASE_ACCESS_TOKEN**: `npx supabase link` and `npx supabase db push` require `SUPABASE_ACCESS_TOKEN` or an interactive `npx supabase login` session. Same pattern as `CLOUDFLARE_API_TOKEN` documented in AGENTS.md.

## Success Criteria (Summary)

- `npx supabase db push` applies the migration cleanly; both tables visible in Supabase Dashboard with RLS enabled.
- `npm run lint` and `npm run build` both pass with no new errors.
- Unauthenticated `SELECT * FROM public.flashcards` returns 0 rows — RLS is enforced.
