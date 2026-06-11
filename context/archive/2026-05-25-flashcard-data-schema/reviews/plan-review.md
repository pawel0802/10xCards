<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Flashcard Data Schema Implementation Plan

- **Plan**: `context/changes/flashcard-data-schema/plan.md`
- **Mode**: Deep
- **Date**: 2026-05-25
- **Verdict**: REVISE
- **Findings**: 1 critical | 1 warning | 1 observation

## Verdicts

| Dimension             | Verdict |
| --------------------- | ------- |
| End-State Alignment   | WARNING |
| Lean Execution        | PASS    |
| Architectural Fitness | PASS    |
| Blind Spots           | FAIL    |
| Plan Completeness     | WARNING |

## Grounding

5/5 paths ✓, 3/3 symbols ✓, brief↔plan ✓

## Findings

### F1 — All verification workflow targets local Docker; user has external Supabase only

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Desired End State, Phase 1 Manual Verification, Testing Strategy, Migration Notes, plan-brief (Prerequisites + Success Criteria)
- **Detail**: The plan's Open Risks correctly flags "Local Docker availability" but resolves it as "defer manual verification" — wrong. Every apply and verification step uses the local workflow (`db reset`, `localhost:54323`). The project uses hosted Supabase at https://ienydkltkzzxsxvtquxe.supabase.co with no local Docker. `npx supabase db reset` against a linked remote project would DROP ALL DATA. Correct workflow: `npx supabase link --project-ref ienydkltkzzxsxvtquxe` → `npx supabase db push` → verify in Supabase Dashboard.
- **Fix A ⭐ Recommended**: Replace all local-Docker references with the remote-first workflow throughout the plan and plan-brief.
  - Strength: Matches actual environment; db push only applies new migrations, never drops data.
  - Tradeoff: Requires SUPABASE_ACCESS_TOKEN or `supabase login` (see F2).
  - Confidence: HIGH — standard Supabase CLI workflow for hosted projects.
  - Blind spot: Whether project is already linked via .supabase/ config — check at implementation time.
- **Decision**: FIXED via Fix A

### F2 — SUPABASE_ACCESS_TOKEN not mentioned as prerequisite for db push

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Migration Notes / Phase 1 Manual Verification
- **Detail**: `npx supabase link` and `npx supabase db push` require either `npx supabase login` or `SUPABASE_ACCESS_TOKEN`. AGENTS.md already documents this pattern for CLOUDFLARE_API_TOKEN — same pattern applies here.
- **Fix**: Add prerequisite note to Phase 1 Manual Verification and Migration Notes.
- **Decision**: FIXED

### F3 — Trigger function contract should use CREATE OR REPLACE FUNCTION

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 Contract — item 1
- **Detail**: Plain `CREATE FUNCTION` fails if the migration is ever re-applied (e.g., second environment). Standard Supabase practice is `CREATE OR REPLACE FUNCTION`.
- **Fix**: Change contract line to explicitly require `CREATE OR REPLACE FUNCTION public.handle_updated_at()`.
- **Decision**: FIXED
