---
date: 2026-06-09T12:49:01+02:00
researcher: Copilot
git_commit: fda363000cdae822b03188da88c697abd5de9bf6
branch: feature/test-plan-phase-2
repository: pawel0802/10xCards
topic: "Pagination and review integration (Phase 2)"
tags: [research, pagination, review, flashcards]
status: complete
last_updated: 2026-06-09
last_updated_by: Copilot
---

# Research: Pagination and review integration (Phase 2)

**Date**: 2026-06-09T12:49:01+02:00
**Researcher**: Copilot
**Git Commit**: fda363000cdae822b03188da88c697abd5de9bf6
**Branch**: feature/test-plan-phase-2
**Repository**: pawel0802/10xCards

## Research Question

Ground rollout Phase 2: verify risks #2 (pagination) and #3 (review sessions) from context/foundation/test-plan.md and identify the cheapest useful tests and any speculative/missing surfaces.

## Summary

- Pagination is implemented at the API and service layer; key code paths live in `src/pages/api/flashcards.ts` and `src/lib/services/flashcards.ts`. There is a small unit/integration test surface for the UI list (`src/components/FlashcardList.test.tsx`) but the suite is sparse.
- Review-session scheduling is represented in product docs and prior changes (`context/foundation/prd.md`, `context/changes/spaced-repetition-review`) but there is no obvious `GET /api/review/due` or `getDueFlashcards` API found; review persistence and scheduling code paths need grounding by `/10x-research` consumers in this change (see Open Questions).
- Hot-spot churn (last 30 days) concentrates in `src/components` and `src/pages` and `src/pages/api` (see Churn Summary). That supports the plan's likelihood evidence.

## Detailed Findings

### API: flashcards listing

- `src/pages/api/flashcards.ts` — validates paging params and calls the service:
  - `src/pages/api/flashcards.ts:7` — pageSize zod validation: `pageSize: z.coerce.number().min(1).max(50).default(10)`
  - `src/pages/api/flashcards.ts:35-36` — parses `{ page, pageSize }` and calls `getFlashcards(user.id, page, pageSize, ...)`

- `src/lib/services/flashcards.ts` — service uses numeric paging and slices results:
  - `src/lib/services/flashcards.ts:14` — `pageSize = 10,` default
  - `src/lib/services/flashcards.ts:22-23` — computes `from = (page - 1) * pageSize; to = from + pageSize - 1;` and likely returns a slice based on created_at ordering

Implication: the list API and service use simple offset-based paging derived from page/pageSize. Tests should exercise edit-after-list flows and ordering guarantees (created_at ordering) to catch duplication or missing items when concurrent edits occur.

### UI tests and components

- `src/components/FlashcardList.test.tsx:85` — has a test "shows/hides pagination buttons correctly" covering button visibility but not end-to-end paging with persisted edits.
- The test-base is sparse for integration scenarios that couple list edits → refetch → pagination boundary effects.

### Review session / scheduling

- Product docs require spaced-repetition scheduling (PRD FR-006). Prior research notes (`context/changes/spaced-repetition-review/research.md`) indicate a missing `getDueFlashcards` endpoint and that `getFlashcards` returns a paginated list ordered by created_at (not by due date).
- No clear single API surfaced that returns due cards for a review session; the code paths implementing scheduling were not located in this pass and must be grounded by deeper reading of `src/lib` services that touch scheduling, or by searching for functions named `schedule`, `due`, `getDue`, `nextReview`, etc. (See Open Questions).

### Test files found

- `src/components/FlashcardList.test.tsx` — UI pagination visibility test.
- Reference test cited in plan: `src/pages/api/generate-flashcards.test.ts` (verify existence and coverage level; not yet inspected here).
- Many `*.test.*` files exist in `src/components` and `src/pages/api` — the suite is present but sparse outside a few focused tests.

## Churn summary (git, 30 days)

Top directories by file-change count in last 30 days (scoped to `src` + `supabase/migrations`):
- src/components — 108
- src/pages — 24
- src/pages/api — 23
- src/lib/services — 16
- src/lib — 10
- supabase/migrations — 5

This supports the plan's hot-spot evidence pointing at `src/components` and `src/lib` as likely-change areas.

## Code References

- `src/pages/api/flashcards.ts:7` — pageSize zod validation
- `src/pages/api/flashcards.ts:35-36` — parsing page/pageSize and calling getFlashcards
- `src/lib/services/flashcards.ts:14` — default pageSize
- `src/lib/services/flashcards.ts:22-23` — offset calculation for slicing
- `src/components/FlashcardList.test.tsx:85` — pagination button visibility test

(If permalinks are required, re-run on a pushed commit or main branch to generate GitHub blob URLs.)

## Open Questions

1. Where is the review-session entrypoint (server API or service) that returns due cards and advances scheduling? Search for `getDue`, `due`, `nextReview`, `schedule`, `applyReview`, or `reviewResult` across `src/lib` and `src/pages/api`.
2. Are there existing integration tests that exercise edit → refetch → page boundary flows? If not, recommend adding one small integration test that:
   - creates enough cards to populate multiple pages,
   - edits/removes a card near a page boundary,
   - re-requests the same page and verifies no drops/duplicates.
3. Confirm whether `getFlashcards` is used by review flows or only listing — if review uses a separate due-listing path, tests must target that API instead of list paging.

## Recommendations (cheap × signal)

- Add one integration test that simulates a user edit at a page boundary and verifies list stability (cheap: uses existing Vitest harness, signal: catches common pagination regressions).
- Ground review-session behavior by locating the scheduling code or API. If no due-listing API exists, add a contract-level integration test for the review flow that seeds due items and verifies ordering and scheduling persistence.
- Avoid snapshot-only assertions for lists; assert IDs/order and ownership filters.

## Next steps

- Run `/10x-plan testing-pagination-and-review-integration` to draft a plan with sub-phases (cheap integration test first, then review grounding), or run targeted search for scheduling functions and re-run `/10x-research` to answer Open Question #1.

---

Research artifacts written:
- `context/changes/testing-pagination-and-review-integration/research.md` (this file)

If more depth is wanted (detailed code walk for scheduling, or permalinks inserted), say so and specify the focus (e.g., "find scheduling implementation") and the depth (quick vs deep).