# Manual Card Creation — Plan Brief

> Full plan: `context/changes/manual-card-creation/plan.md`

## What & Why
Implement a dedicated manual flashcard creation flow, accessible from the /generate page, allowing users to add custom cards with validation. This enables users to supplement AI-generated cards with their own, supporting unique study needs.

## Starting Point
Currently, flashcards are created via AI generation. The data model and backend already support a "manual" source, but there is no UI for manual entry. Auth, validation, and deck update patterns are established in existing components.

## Desired End State
Users can create flashcards manually from a dedicated page, with both fields required, 9–300 characters for front, 3–300 for back. Cards are saved with source: "manual". Editing is not available after creation in this flow, but will be possible from the Card Management view (S-03).

## Key Decisions Made
| Decision | Choice | Why | Source |
|--------------------------|-----------------------------|------------------------------------------------------|-------|
| Entry point | Button on /generate → new page | Clean UX, clear separation | Plan |
| Required fields | Both front & back | Prevents incomplete cards | Plan |
| Card mutability | Editable only from Card Management (S-03) | Keeps creation flow simple, edit UI deferred | Plan |
| Field length | 9–300 front, 3–300 back | Prevents junk/unwieldy cards | Plan |
| Auth | Required | Prevents spam, matches model | Plan |
| Success/error feedback | Same as AI cards | Consistent UX | Plan |
| Deck update | Not in scope | Deck UI handled elsewhere | Plan |
| Distinction | Only source: "manual" saved | Icon in S-03 | Plan |

## Scope
**In scope:** Manual card creation UI, backend validation, saving with source: "manual".
**Out of scope:** Deck/list UI integration, icon/UI distinction, bulk import, mobile-specific UI. Editing after creation is deferred to Card Management (S-03).

## Architecture / Approach
- Add a "Create manually" button to /generate, routing to a new page/component.
- Form with front/back fields, 9–300/3–300 char limits, both required.
- POST to /api/save-flashcards with source: "manual".
- On success, show feedback; on error, show inline message.

## Phases at a Glance
| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. UI & Routing | Manual creation page, button, form | Navigation bugs |
| 2. Backend & Validation | API, DB, min/max char, required fields | Validation gaps |

**Prerequisites:** Existing /generate page, working /api/save-flashcards endpoint
**Estimated effort:** ~2 sessions across 2 phases

## Open Risks & Assumptions
- Assumes no deck/list UI update is needed
- Assumes edit UI will be handled in Card Management (S-03)

## Success Criteria (Summary)
- Users can create manual cards with required fields and limits
- Cards are saved with source: "manual"
- Errors and success are clearly communicated
