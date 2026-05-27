# Manual Card Creation Implementation Plan

## Overview
Implement a dedicated manual flashcard creation flow, accessible from the /generate page, with validation, backend integration, and immediate deck update. This enables users to add custom cards alongside AI-generated ones, supporting unique study needs.

## Current State Analysis
- Flashcards are currently created via AI generation only.
- Data model (`Flashcard`, `FlashcardCreateDto`) and backend (`/api/save-flashcards`) support a "manual" source.
- Auth, validation, and deck update patterns are established in existing components.

## Desired End State
- Users can create flashcards manually from a dedicated page.
- Both front and back fields are required, with 300-character limits.
- Cards are editable only from Card Management (S-03) after creation.
- Manual cards are saved with source: "manual". Visual distinction and deck UI update are out of scope for this plan.

### Key Discoveries:
- Manual data entry patterns exist in auth forms (`SignInForm`, `SignUpForm`).
- Deck/list UI and backend already support new cards and source tagging.
- Validation and feedback patterns are established in review and auth flows.

## What We're NOT Doing
- No editing of manual cards after creation in this flow (editing deferred to Card Management/S-03).
- No bulk import or file upload.
- No mobile-specific UI changes.

## Implementation Approach
- Add a "Create manually" button to /generate, routing to a new page/component.
- Form with front/back fields, 300-char limits, both required.
- POST to /api/save-flashcards with source: "manual".
- On success, update deck and show feedback; on error, show inline message.
- Visual distinction (icon) for manual cards is deferred to Card Management (S-03).

## Phase 1: UI & Routing
### Overview
Add a "Create manually" button to /generate. Create a new page/component for manual card entry with front/back fields and validation.
### Changes Required:
#### 1. GenerateFlashcards component
**File**: `src/components/GenerateFlashcards.tsx`
**Intent**: Add a "Create manually" button that routes to the manual creation page.
**Contract**: Button triggers navigation to `/manual-create`.

#### 2. New ManualCreateFlashcard component/page
**File**: `src/components/ManualCreateFlashcard.tsx` and `src/pages/manual-create.astro`
**Intent**: Render form with front/back fields, 300-char limits, both required. Show inline errors.
**Contract**: Controlled inputs, validation, submit button disabled until valid.

### Success Criteria:
#### Automated Verification:
- Linting passes: `npm run lint`
- Type checking passes: `npm run typecheck`
#### Manual Verification:
- Button appears and routes correctly
- Form renders, validates, and disables submit until valid

---

## Phase 2: Backend & Validation
### Overview
Ensure API and DB support for manual cards, enforce 300-char limit and required fields, and set source to "manual".
### Changes Required:
#### 1. API validation
**File**: `src/pages/api/save-flashcards.ts`
**Intent**: Enforce 300-char limit and required fields for manual cards. Set `source: "manual"` on insert.
**Contract**: Zod schema updated, backend inserts with correct source.

#### 2. Data model
**File**: `src/types.ts`
**Intent**: Ensure `FlashcardCreateDto` includes `source` and is used in API.
**Contract**: DTO matches backend expectations.

### Success Criteria:
#### Automated Verification:
- Linting passes: `npm run lint`
- Type checking passes: `npm run typecheck`
#### Manual Verification:
- API rejects invalid/overlong input
- Cards saved with correct source

---


---

## Testing Strategy
### Unit Tests:
- Validate form logic and field limits
- API rejects invalid/overlong input
### Integration Tests:
- End-to-end manual card creation flow
### Manual Testing Steps:
1. Create manual card, verify save and feedback
2. Attempt invalid/overlong input, verify rejection
3. Simulate save error, verify inline error

## Performance Considerations
- No significant impact expected; form and deck update are lightweight

## Migration Notes
- None needed; DB already supports manual cards

## References
- Related research: `context/changes/manual-card-creation/change.md`
- Similar implementation: `src/components/SignUpForm.tsx`, `src/components/ReviewFlashcards.tsx`

## Progress
### Phase 1: UI & Routing
#### Automated
- [ ] 1.1 Linting passes
- [ ] 1.2 Type checking passes
#### Manual
- [x] 1.3 Button appears and routes correctly
- [x] 1.4 Form renders, validates, disables submit until valid

### Phase 2: Backend & Validation
#### Automated
- [ ] 2.1 Linting passes
- [ ] 2.2 Type checking passes
#### Manual
- [x] 2.3 API rejects invalid/overlong input
- [x] 2.4 Cards saved with correct source

