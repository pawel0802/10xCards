---
date: 2026-06-02T10:05:26.560+02:00
researcher: GitHub Copilot
git_commit: 2de48f93e4d1582fdd03646160960cc2a9b0bc35
branch: main
repository: pawel0802/10xCards
topic: "Phase 1 critical-path coverage for generation and persistence"
tags: [research, codebase, vitest, flashcards, api, rls]
status: complete
last_updated: 2026-06-02
last_updated_by: GitHub Copilot
---

# Research: Phase 1 critical-path coverage for generation and persistence

**Date**: 2026-06-02T10:05:26.560+02:00
**Researcher**: GitHub Copilot
**Git Commit**: 2de48f93e4d1582fdd03646160960cc2a9b0bc35
**Branch**: main
**Repository**: pawel0802/10xCards

## Research Question

What is the cheapest useful coverage for the phase-1 critical path: AI generation, review/acceptance, and persistence of accepted cards?

## Summary

The cheapest high-signal phase-1 coverage is a mix of API-handler unit tests and a focused component test on the review boundary. The generation path already has unit coverage around the AI service and generate endpoint, but the handoff from generated candidates to saved flashcards is not covered. The biggest gaps are `ReviewFlashcards.tsx` and `save-flashcards.ts`, plus the card-list persistence endpoints that protect ownership and reload behavior.

## Detailed Findings

### AI generation boundary

- `GenerateFlashcards.tsx` gates generation client-side at 50 chars, stores generated cards in `localStorage`, and navigates to `/review` after a short delay. The API itself only requires non-empty input, so the UI and API validations are intentionally different.
- `generate-flashcards.ts` accepts `batchSize`, but the service call does not forward it, so the parameter is effectively dead.
- `src/lib/services/ai.ts` already validates OpenRouter config, retries three times, and validates JSON shape before returning candidates.

### Review and save handoff

- `ReviewFlashcards.tsx` is the load-bearing UI boundary: it reads `localStorage["reviewCandidates"]`, marks edits/accepts/rejects, and POSTs accepted cards to `save-flashcards`.
- Accept/save success does not block index advancement; the card can disappear from the queue even if save fails, so the review component needs direct tests around success and failure.
- `save-flashcards.ts` forces `user_id` from `context.locals.user`, validates card shape with zod, and inserts into `flashcards`; this is the cheapest place to prove persistence behavior without real infra.

### Ownership and isolation

- Middleware sets `context.locals.user` from verified Supabase auth cookies, and all API handlers guard unauthenticated requests.
- Service queries scope by `user_id` on reads, updates, and deletes, and the active migration enforces RLS.
- The strongest ownership evidence is defense-in-depth: auth middleware, handler guards, query scoping, and RLS all agree on the same user boundary.

## Code References

- [`src/components/GenerateFlashcards.tsx#L21-L47`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/components/GenerateFlashcards.tsx#L21-L47) - localStorage handoff from generated candidates to `/review`
- [`src/components/GenerateFlashcards.tsx#L71`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/components/GenerateFlashcards.tsx#L71) - client-side minimum-length gate
- [`src/pages/api/generate-flashcards.ts#L5-L24`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/pages/api/generate-flashcards.ts#L5-L24) - endpoint validation and AI call
- [`src/lib/services/ai.ts#L16-L89`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/lib/services/ai.ts#L16-L89) - AI retry/parse/shape validation
- [`src/components/ReviewFlashcards.tsx#L18-L114`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/components/ReviewFlashcards.tsx#L18-L114) - review queue, edit/accept/reject, and save handoff
- [`src/pages/api/save-flashcards.ts#L5-L53`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/pages/api/save-flashcards.ts#L5-L53) - zod validation, auth guard, DB insert
- [`src/pages/api/flashcards.ts#L7-L10`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/pages/api/flashcards.ts#L7-L10) - page/pageSize validation
- [`src/lib/services/flashcards.ts#L16-L55`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/lib/services/flashcards.ts#L16-L55) - scoped list/update/delete queries
- [`src/lib/services/review.ts#L16-L108`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/lib/services/review.ts#L16-L108) - due-card selection and atomic review submission
- [`src/middleware.ts#L6-L25`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/src/middleware.ts#L6-L25) - request auth resolution
- [`supabase/migrations/20260601_create_fsrs_flashcards_and_review_logs.sql#L30-L36`](https://github.com/pawel0802/10xCards/blob/2de48f93e4d1582fdd03646160960cc2a9b0bc35/supabase/migrations/20260601_create_fsrs_flashcards_and_review_logs.sql#L30-L36) - RLS policies

## Architecture Insights

- The app uses defense in depth for ownership: auth middleware, handler guards, service-level `user_id` filters, and RLS all overlap.
- The generation flow is split between browser state (`localStorage`) and a server save endpoint; that boundary is the weakest link for phase 1.
- Persistence correctness depends more on route and component behavior than on the AI provider itself, so provider-specific tests are lower signal.
- The test base is sparse but already standardized on Vitest, so new coverage should follow the existing handler/component testing style instead of introducing new infrastructure.

## Historical Context (from prior changes)

- `context/changes/flashcard-data-schema/change.md` - implemented foundation for `flashcards` and `review_logs` with RLS; unlocks the persistence paths this phase now tests.
- `context/changes/ai-generation-and-review/change.md` - the AI generation slice already identified generation quality as the core risk and left provider choice open.
- `context/foundation/roadmap.md` - phase S-01 and S-04 are now complete, so this rollout is now about protecting shipped behavior rather than sequencing new product work.

## Related Research

- `context/changes/testing-critical-path-coverage/research.md` - current phase research artifact
- `context/changes/ai-generation-and-review/change.md` - historical slice notes
- `context/changes/flashcard-data-schema/change.md` - historical schema foundation

## Open Questions

- Should phase 1 add a focused component test for `ReviewFlashcards.tsx` in addition to route-handler unit tests?
- Should the generate endpoint get an explicit regression test for the dead `batchSize` parameter, or is that better left to a follow-up phase?
- Should the save endpoint return inserted IDs or remain fire-and-forget?
