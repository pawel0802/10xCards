# Pagination and review integration — Implementation Plan

## Overview

Prove that list pagination does not drop, duplicate, or misorder user-owned cards under edits and that review sessions serve due cards in the right order and persist scheduling correctly.

## Current State Analysis

- Research: `context/changes/testing-pagination-and-review-integration/research.md` (see code refs).
- Paging implemented at API/service: `src/pages/api/flashcards.ts` and `src/lib/services/flashcards.ts` use offset-based paging (page,pageSize).
- UI has a visibility test (`src/components/FlashcardList.test.tsx`), but lacks end-to-end integration tests for edit→refetch→boundary flows.
- No clear "due-cards" API located; scheduling entrypoint not yet grounded.

## Desired End State

- Integration tests cover page-boundary edits and verify list stability (no drops/duplicates) using real DB fixtures.
- Review-session tests or API contract exist to verify due-card ordering and scheduling persistence.
- Progress recorded in `## Progress` with automated and manual checks.

## Key Discoveries

- `src/pages/api/flashcards.ts:7,35-36` — page param parsing and call to `getFlashcards`
- `src/lib/services/flashcards.ts:14,22-23` — default pageSize and offset slice calculation
- `src/components/FlashcardList.test.tsx:85` — pagination button visibility test
- Hot-spot churn concentrated in `src/components` and `src/pages/api` (see research)

## What We're NOT Doing

- Provider-specific Supabase/Cloudflare behavior tests (explicitly out of scope per plan). These belong to infra/monitoring.
- Full e2e suite or broad UI automation beyond a narrow smoke/integration harness.

## Implementation Approach

Incremental, cost×signal: start with an integration boundary test exercising DB-backed edits at page boundaries. Then ground review-session scheduling via focused code discovery and contract tests. Finally add ownership/RLS checks if needed.

## Critical Implementation Details

- Tests will use the project's Vitest harness and a test database fixture (match what's used elsewhere in repo). Ensure migrations/seeding run in CI for these tests.
- The list API uses offset paging; integration tests must simulate realistic sequences (create N items, navigate to page K, edit/delete an item at boundary, re-request the page, assert stable IDs/order).
- For review scheduling, do not assume `getFlashcards` is the review entrypoint; plan to locate or add a `GET /api/review/due` or equivalent contract during Phase 2.

## Phase 1: Integration boundary test (cheap × signal)

### Overview
Create an integration test that seeds enough cards for multiple pages, performs an edit/delete near a page boundary, re-fetches the affected page(s), and asserts no drops/duplicates and correct ownership.

### Changes Required

#### 1. Test harness / fixtures

**Files**: `context/changes/testing-pagination-and-review-integration/plan.md` (this plan), new test file `src/__tests__/integration/pagination-boundary.test.ts` (or follow existing tests layout)

**Intent**: Add an integration test that uses real DB fixtures and the existing API route(s) to simulate user behavior across list pages.

**Contract**:
- Seed helper creates 25 cards for a user (enough for >2 pages with default pageSize=10).
- The test navigates (via HTTP requests) to page 2, edits/removes the last item on page 2, then re-requests page 2 and page 3 and asserts:
  - No missing IDs among returned items for the user
  - No duplicated IDs across pages
  - Ownership filter still applies (user only sees own cards)

### Success Criteria

#### Automated Verification:
- [ ] 1.1 Integration test `pagination-boundary.test.ts` exists and passes in CI
- [ ] 1.2 Migrations/seeding step runs successfully in test harness
- [ ] 1.3 Vitest suite including integration tests completes without flakiness in local run

#### Manual Verification:
- [ ] 1.4 Manually reproduce the sequence via Postman or local UI and verify list stability

## Phase 2: Ground review-session scheduling

### Overview
Locate the review-session entrypoint (API/service) that returns due cards and advances scheduling. If missing, define a contract and add tests that verify ordering and persistence of scheduling changes.

### Changes Required

#### 1. Discovery + contract

**Files**: research update `context/changes/testing-pagination-and-review-integration/research.md`, new `src/__tests__/integration/review-scheduling.test.ts` as needed

**Intent**: Find scheduling code (search for `due`, `schedule`, `nextReview`, `applyReview`) and pin the contract. If no due-cards API exists, propose a minimal contract:

**Contract (if added)**:
- `GET /api/review/due?userId=<id>&limit=<n>` returns ordered list of due cards by next_review_date asc
- `POST /api/review/result` accepts `{ cardId, result }` and persists scheduling outcome

### Success Criteria

#### Automated Verification:
- [x] 2.1 discovery documented and research.md updated with file:line anchors
- [x] 2.2 integration/contract tests exercising due-card listing and review result persistence pass

#### Manual Verification:
- [x] 2.3 Manual review session run through UI to verify order and scheduling persistence

## Phase 3: Ownership / RLS contract tests (optional)

### Overview
Verify user isolation: one user cannot read/update another user's cards, and sensitive fields are not leaked.

### Changes Required

- Add contract-level integration tests that exercise read/write as User A and User B and assert isolation.

### Success Criteria

#### Automated Verification:
- [ ] 3.1 Contract tests for ownership pass (read/write guards enforced)

#### Manual Verification:
- [ ] 3.2 Spot-check in UI that users cannot access others' cards

## Testing Strategy

### Unit Tests
- Add unit tests for `getFlashcards` slice logic if gaps found during Phase 1.

### Integration Tests
- Phase 1 boundary test (primary)
- Phase 2 due-listing and review-result persistence tests
- Phase 3 ownership contract tests

### Manual Testing Steps
1. Seed test data locally with migration and fixture script
2. Run the new integration tests
3. Manually perform edit/delete at a page boundary and walk pages to verify stability
4. Start a review session, submit answers, reload the session and confirm scheduling persisted

## Performance Considerations

- Offset pagination is acceptable for current scale; if growth requires cursor-based pagination, plan a follow-up change.

## Migration Notes

- Ensure test DB migrations mirror prod migrations. No production migrations planned for this change.

## References

- Research: `context/changes/testing-pagination-and-review-integration/research.md`
- Test examples: `src/components/FlashcardList.test.tsx:85`
- API: `src/pages/api/flashcards.ts:7,35-36`
- Service: `src/lib/services/flashcards.ts:14,22-23`

## Progress

### Phase 1: Integration boundary test

#### Automated
- [x] 1.1 Integration test `pagination-boundary.test.ts` exists and passes in CI
- [x] 1.2 Migrations/seeding step runs successfully in test harness
- [x] 1.3 Vitest suite including integration tests completes without flakiness in local run

#### Manual
- [x] 1.4 Manually reproduce the sequence via Postman or local UI and verify list stability

### Phase 2: Ground review-session scheduling

#### Automated
- [x] 2.1 discovery documented and research.md updated with file:line anchors
- [x] 2.2 integration/contract tests exercising due-card listing and review result persistence pass

#### Manual
- [x] 2.3 Manual review session run through UI to verify order and scheduling persistence

### Phase 3: Ownership / RLS contract tests

#### Automated
- [x] 3.1 Contract tests for ownership pass (read/write guards enforced)

#### Manual
- [x] 3.2 Spot-check in UI that users cannot access others' cards



---

Generated by Copilot on 2026-06-09
