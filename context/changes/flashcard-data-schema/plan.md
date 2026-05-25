# Flashcard Data Schema Implementation Plan

## Overview

Create the Supabase SQL migration that defines the `flashcards` and `review_logs` tables with Row Level Security, performance indexes, and an `updated_at` trigger. Then expose clean TypeScript entity and DTO types in `src/types.ts`. This is Foundation F-01 — it unblocks every other slice in the roadmap (S-01 through S-04).

## Current State Analysis

- `supabase/migrations/` directory does **not exist** — must be created.
- `src/types.ts` is **absent** — must be created.
- Auth is fully wired: `src/lib/supabase.ts` uses `@supabase/ssr`, `src/middleware.ts` resolves `auth.uid()` on every request, and `context.locals.user` is populated. RLS policies can safely use `auth.uid()`.
- `supabase` CLI (v2.23.4) is in devDependencies — `npx supabase db push` is the apply command for the hosted project (`ienydkltkzzxsxvtquxe.supabase.co`). No local Docker is used.
- No Makefile, no `typecheck` or `test` npm scripts — only `npm run lint`, `npm run build`, and `npm run format`.

### Key Discoveries

- AGENTS.md hard rule: **RLS on every new Supabase table — enable and add policies in the same migration file** (`src:AGENTS.md` — "RLS on every new Supabase table").
- Migration naming convention: `supabase/migrations/YYYYMMDDHHmmss_<desc>.sql` (`src:AGENTS.md` — "Supabase migrations").
- `src/types.ts` is the declared home for shared entity and DTO types (`src:AGENTS.md` — "types.ts (shared entity and DTO types)").
- Path alias `@/*` → `src/*` is wired in `tsconfig.json`.
- TypeScript strict mode is enabled (`"extends": "astro/tsconfigs/strict"`).

## Desired End State

After this plan completes:

- `supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql` exists and applies cleanly via `npx supabase db push` to the hosted project (`ienydkltkzzxsxvtquxe.supabase.co`).
- `public.flashcards` table exists with RLS enabled and four per-operation policies; includes SR scheduling columns (due_date, interval_days, ease_factor, repetitions) ready for S-04.
- `public.review_logs` table exists with RLS enabled and two policies (SELECT + INSERT — immutable audit trail).
- `src/types.ts` exports `Flashcard`, `ReviewLog`, and DTO types (`FlashcardCreateDto`, `FlashcardUpdateDto`, `ReviewLogCreateDto`).
- `npm run lint` and `npm run build` pass with no new errors.

### Key Discoveries

- No existing `src/types.ts` to extend or conflict with.
- `auth.users` is the Supabase managed auth table; `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE` is the standard pattern.
- `gen_random_uuid()` is the standard Supabase/PostgreSQL UUID generator (no extension needed in pg14+).
- SR scheduling columns chosen: `due_date`, `interval_days`, `ease_factor`, `repetitions` — SM-2 compatible, sufficient for both SM-2 and ts-fsrs (the likely S-04 library). A S-04 migration can extend this if FSRS-specific columns are needed.
- `source` column (`'ai' | 'manual'`) is included on `flashcards` to track PRD secondary success criterion (≥ 75% of cards from AI generation).

## What We're NOT Doing

- No `supabase gen types` — types are hand-written in `src/types.ts` per AGENTS.md convention.
- No seed data — `supabase/seed.sql` is a separate concern (config.toml already references it but it is absent, which is fine for now).
- No FSRS-specific columns (`stability`, `difficulty`, `state`, `lapses`) — those belong in a S-04 migration if ts-fsrs or FSRS is chosen.
- No soft deletes — hard deletes only (MVP simplicity; no PRD requirement for undo/history).
- No tags, decks, or categories — explicitly deferred per PRD Non-Goals.
- No UPDATE or DELETE policies on `review_logs` — immutable audit trail.

## Implementation Approach

Single migration file handles both tables in one atomic transaction. RLS is enabled and policies added in the same file (AGENTS.md hard rule). An `updated_at` trigger is defined for `flashcards` (review_logs are append-only). Indexes on `user_id` and `(user_id, due_date)` are added upfront to avoid re-migration. TypeScript types are written by hand in `src/types.ts` to match the schema — no code generation.

## Critical Implementation Details

**RLS + `auth.uid()` in policies**: Because the Supabase client is created server-side (SSR), the JWT is passed via cookie. `auth.uid()` in RLS policies resolves from the JWT, not from a session variable — this is correct and standard. No special handling needed.

**Migration filename timestamp**: Use `20260525000000` (today's date + midnight) as the timestamp prefix. If a second migration is needed the same day, use `20260525000001`, etc.

---

## Phase 1: SQL Migration

### Overview

Create the `supabase/migrations/` directory and write the migration that defines both tables, enables RLS, adds policies, creates the `updated_at` trigger function, and adds performance indexes. All in one file per the AGENTS.md hard rule.

### Changes Required

#### 1. Migration file

**File**: `supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql`

**Intent**: Define the full data model for the MVP — flashcard storage (with SR scheduling fields), review history (immutable log), RLS isolation, and performance indexes. This is the atomic foundation all other slices build on.

**Contract**: The file must contain, in order:

1. `CREATE OR REPLACE FUNCTION public.handle_updated_at()` trigger function (plpgsql, returns TRIGGER)
2. `CREATE TABLE public.flashcards` with these columns:
   - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `front text NOT NULL CHECK (char_length(front) > 0)`
   - `back text NOT NULL CHECK (char_length(back) > 0)`
   - `source text NOT NULL DEFAULT 'manual' CHECK (source IN ('ai', 'manual'))`
   - `due_date timestamptz NOT NULL DEFAULT now()`
   - `interval_days integer NOT NULL DEFAULT 0 CHECK (interval_days >= 0)`
   - `ease_factor numeric(4,3) NOT NULL DEFAULT 2.5 CHECK (ease_factor >= 1.0)`
   - `repetitions integer NOT NULL DEFAULT 0 CHECK (repetitions >= 0)`
   - `created_at timestamptz NOT NULL DEFAULT now()`
   - `updated_at timestamptz NOT NULL DEFAULT now()`
3. `ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY`
4. Four RLS policies on `flashcards` (SELECT, INSERT, UPDATE, DELETE), all scoped to `auth.uid() = user_id`
5. `CREATE TRIGGER set_flashcards_updated_at BEFORE UPDATE ON public.flashcards FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()`
6. `CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id)`
7. `CREATE INDEX idx_flashcards_user_due ON public.flashcards(user_id, due_date)`
8. `CREATE TABLE public.review_logs` with these columns:
   - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `flashcard_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE`
   - `rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 4)` — 1=Again, 2=Hard, 3=Good, 4=Easy
   - `reviewed_at timestamptz NOT NULL DEFAULT now()`
9. `ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY`
10. Two RLS policies on `review_logs` (SELECT, INSERT only — append-only table)
11. `CREATE INDEX idx_review_logs_flashcard_id ON public.review_logs(flashcard_id)`
12. `CREATE INDEX idx_review_logs_user_id ON public.review_logs(user_id)`

### Success Criteria

#### Automated Verification

- Migration directory exists: `supabase/migrations/` is present.
- Migration file exists: `supabase/migrations/20260525000000_create_flashcards_and_review_logs.sql`.
- `npm run lint` passes with no new errors on the migration file (ESLint doesn't lint SQL, but the working tree must be clean).

#### Manual Verification

- Link CLI to the hosted project: `npx supabase link --project-ref ienydkltkzzxsxvtquxe` (requires `SUPABASE_ACCESS_TOKEN` in environment, or run `npx supabase login` first — same pattern as `CLOUDFLARE_API_TOKEN` in AGENTS.md).
- `npx supabase db push` completes without error and reports the migration as applied.
- Supabase Dashboard (https://supabase.com/dashboard/project/ienydkltkzzxsxvtquxe/database/tables) shows both tables with expected columns and RLS enabled.
- Attempting to query `public.flashcards` without auth returns 0 rows (RLS is blocking unauthenticated access — test via Dashboard SQL Editor).

**Implementation Note**: After completing this phase and all automated verification passes, pause here to confirm the migration applies cleanly before moving to Phase 2.

---

## Phase 2: TypeScript Types

### Overview

Create `src/types.ts` with entity types that mirror the SQL schema, plus DTO types for API layer use in S-01 through S-04.

### Changes Required

#### 1. `src/types.ts`

**File**: `src/types.ts`

**Intent**: Provide a single, authoritative source of TypeScript types for flashcard entities and API DTOs. All API routes and React components import from here — no inline type definitions in route files.

**Contract**: Export the following types:

- `Flashcard` — full entity matching `public.flashcards` columns (all fields, `rating` omitted — that lives on ReviewLog). Date fields as `string` (ISO 8601 from Supabase JS).
- `ReviewLog` — full entity matching `public.review_logs`. `rating` typed as `1 | 2 | 3 | 4` (not `number`).
- `FlashcardCreateDto` — Pick of `front`, `back`, `source` from Flashcard. Used by S-01 (AI generation) and S-02 (manual creation).
- `FlashcardUpdateDto` — Partial Pick of `front`, `back`. SR fields (`due_date`, `interval_days`, `ease_factor`, `repetitions`) are intentionally excluded — those are updated by the SR engine in S-04, not by user-facing edit.
- `ReviewLogCreateDto` — Pick of `flashcard_id`, `rating`. Used by S-04.

Do not import Supabase-generated types. Keep types plain TypeScript interfaces/type aliases.

### Success Criteria

#### Automated Verification

- `src/types.ts` file exists and is non-empty.
- `npm run lint` passes with no errors in `src/types.ts`.
- `npm run build` passes — the new types file is valid TypeScript and does not introduce circular imports.

#### Manual Verification

- Spot-check: each exported type has the correct field names and types matching the migration schema (e.g., `rating: 1 | 2 | 3 | 4`, `source: 'ai' | 'manual'`, SR fields present on `Flashcard`).

---

## Testing Strategy

### Manual Testing Steps

1. Set `SUPABASE_ACCESS_TOKEN` in your environment, or run `npx supabase login` first (same pattern as `CLOUDFLARE_API_TOKEN` documented in AGENTS.md).
2. Run `npx supabase link --project-ref ienydkltkzzxsxvtquxe` to link the CLI to the hosted project.
3. Run `npx supabase db push` — should report the migration as applied with no errors.
4. Open Supabase Dashboard → https://supabase.com/dashboard/project/ienydkltkzzxsxvtquxe/database/tables → confirm `flashcards` and `review_logs` appear with correct columns.
5. Dashboard → Authentication → Policies → confirm RLS is enabled and 4 policies exist on `flashcards`, 2 on `review_logs`.
6. Dashboard → SQL Editor: run `SELECT * FROM public.flashcards;` — should return 0 rows (RLS blocks anonymous access).
7. Run `npm run lint` and `npm run build` — both must pass.

## Migration Notes

This is the first migration in the project. Running `npx supabase db reset` drops and recreates the local database, then applies all migrations in `supabase/migrations/` in filename order. Future migrations (e.g., S-04 FSRS columns) will be added as new files with later timestamps.

**Remote apply**: The project uses hosted Supabase at `ienydkltkzzxsxvtquxe.supabase.co` — no local Docker is used. Apply migrations via:

```
npx supabase link --project-ref ienydkltkzzxsxvtquxe
npx supabase db push
```

`npx supabase link` requires `SUPABASE_ACCESS_TOKEN` in the environment, or an interactive `npx supabase login` session (same pattern as `CLOUDFLARE_API_TOKEN` in AGENTS.md). Future migrations (e.g., S-04 FSRS columns) will be new files with later timestamps and applied the same way via `npx supabase db push`.

## References

- Roadmap: `context/foundation/roadmap.md` — F-01
- PRD: `context/foundation/prd.md` — FR-001–006, NFR (privacy), Business Logic Rule 2
- AGENTS.md hard rules: RLS on every table, migration naming convention, `src/types.ts` as types home
- Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- SM-2 algorithm reference (for SR column rationale): https://supermemo.guru/wiki/SM-2

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: SQL Migration

#### Automated

- [x] 1.1 Migration directory `supabase/migrations/` exists
- [x] 1.2 Migration file `20260525000000_create_flashcards_and_review_logs.sql` exists
- [x] 1.3 `npm run lint` passes with no new errors

#### Manual

- [ ] 1.4 `npx supabase link` + `npx supabase db push` completes without error
- [ ] 1.5 Both tables visible in Supabase Dashboard with expected columns and RLS enabled
- [ ] 1.6 Unauthenticated `SELECT * FROM public.flashcards` returns 0 rows (RLS active)

### Phase 2: TypeScript Types

#### Automated

- [x] 2.1 `src/types.ts` exists and is non-empty
- [x] 2.2 `npm run lint` passes with no errors in `src/types.ts`
- [x] 2.3 `npm run build` passes

#### Manual

- [ ] 2.4 Spot-check: exported types match migration schema (rating, source, SR fields)
