# Critical-path Coverage Implementation Plan

## Overview

Lock down the critical path from AI generation into saved flashcards with the
cheapest tests that prove the handoff works and that saves fail safely.

## Current State Analysis

- The generation flow already stores candidates in `localStorage` and routes
  to `/review`, but neither side of that browser handoff is covered by tests.
- `ReviewFlashcards` is the load-bearing save path: it reads the candidate
  queue, edits statuses, and POSTs accepted cards to `save-flashcards`.
- `save-flashcards` already validates input and injects `user_id` from
  `context.locals.user`, but it has no dedicated route tests.
- Existing coverage already exercises the AI service and generate endpoint, so
  this change should avoid duplicating that surface.
- Ownership/RLS is already defended by middleware, service scoping, and the
  active migration; this change should not expand into that area.

## Desired End State

After this plan lands, the critical path has direct tests for the browser
handoff and the persistence endpoint. A generated candidate can be loaded in
the review screen, accepted or edited, and saved through the API with
failure-state feedback still visible. The save handler is covered for auth,
validation, success, and DB error cases.

### Key Discoveries:

- `GenerateFlashcards` writes `reviewCandidates` to `localStorage` before
  navigating to `/review`.
- `ReviewFlashcards` reads that storage key on mount and is the right place to
  test the accept/edit/reject/save boundary.
- `save-flashcards` derives ownership from `context.locals.user`, so handler
  tests must set the session in the fake route context.
- Existing AI and generation endpoint tests mean the change can stay focused
  on the browser handoff and save endpoint instead of re-covering provider
  behavior.

## What We'"'"'re NOT Doing

- No Supabase or Cloudflare provider-specific tests.
- No ownership/RLS integration tests in this change.
- No flashcard list, pagination, or review-history work.
- No product fixes for unrelated regressions surfaced by research.

## Implementation Approach

Use two phases. First, cover the browser-local handoff with component tests
for `GenerateFlashcards` and `ReviewFlashcards`. Second, add route-handler
tests for `save-flashcards` so persistence and failure handling are proven at
the API boundary. Keep mocks at the edge and reuse the existing Vitest style.

## Critical Implementation Details

`ReviewFlashcards` does not have an SSR data fallback on the happy path; the
candidate queue comes from `localStorage`, so the tests need to exercise that
state transition directly. Save failures should be asserted through the
visible error/retry state, not by rewriting the component to hide the problem.
`save-flashcards` must continue to source ownership from the authenticated
session, not from request payloads.

## Phase 1: Testing the browser handoff and review flow

### Overview

Protect the generate → review → save browser path and the candidate review UX.

### Changes Required:

#### 1. Generate flashcards handoff tests

**File**: `src/components/GenerateFlashcards.test.tsx`

**Intent**: Verify generated candidates are serialized to `localStorage` and
the review route is reached after generation succeeds.

**Contract**: `reviewCandidates` storage key and navigation to `/review`.

#### 2. Review flashcards interaction tests

**File**: `src/components/ReviewFlashcards.test.tsx`

**Intent**: Verify the review screen loads candidates from `localStorage`,
lets the user edit/accept/reject them, and surfaces save failure/retry
behavior.

**Contract**: candidate status transitions, save request payload, and visible
error/retry state.

### Success Criteria:

#### Automated Verification:

- `npm test`
- `npm run lint`

#### Manual Verification:

- Run a quick generate → review → save smoke in the browser.
- Confirm candidates appear on `/review`, can be edited/accepted/rejected,
  and a failed save leaves a visible retry path.

## Phase 2: Testing the save-flashcards handler

### Overview

Prove the persistence endpoint accepts valid cards, rejects bad input, and
fails loudly when the database insert fails.

### Changes Required:

#### 1. Save flashcards handler tests

**File**: `src/pages/api/save-flashcards.test.ts`

**Intent**: Verify auth guard, zod validation, successful insert behavior, and
DB error handling at the route boundary.

**Contract**: `context.locals.user` ownership source, card payload validation,
and insert response handling.

### Success Criteria:

#### Automated Verification:

- `npm test`
- `npm run lint`

#### Manual Verification:

- Refresh after saving from the review flow and confirm the saved flashcard
  appears in the list.

## Testing Strategy

### Unit Tests:

- `GenerateFlashcards` localStorage handoff and navigation.
- `ReviewFlashcards` candidate loading, edit/accept/reject flow, and retry
  state on save failure.

### Integration Tests:

- `save-flashcards` route behavior with mocked Supabase insert failures and
  validation errors.

### Manual Testing Steps:

1. Generate a short sample note block.
2. Review the candidates, edit one, and accept one.
3. Force a save failure once, then retry and confirm the success path still
   works.

## Performance Considerations

None beyond the existing localStorage/browser flow and the cost of a few more
Vitest cases. The change should not alter runtime performance.

## Migration Notes

No migration is needed. This change is test coverage only.

## References

- Related research: `context/changes/testing-critical-path-coverage/research.md`
- Similar implementation: `src/pages/api/generate-flashcards.test.ts`
- Similar implementation: `src/components/FlashcardList.test.tsx`
- Similar implementation: `src/lib/services/ai.test.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a
> step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Testing the browser handoff and review flow

#### Automated

- [x] 1.1 Add `GenerateFlashcards` localStorage handoff coverage
- [x] 1.2 Add `ReviewFlashcards` accept/edit/reject/save coverage
- [x] 1.3 Run `npm test` and `npm run lint`

#### Manual

- [x] 1.4 Run the browser generate → review → save smoke

### Phase 2: Testing the save-flashcards handler

#### Automated

- [x] 2.1 Add `save-flashcards` auth, validation, and DB error coverage
- [x] 2.2 Re-run `npm test` and `npm run lint`

#### Manual

- [x] 2.3 Refresh after saving and confirm the card appears in the list
