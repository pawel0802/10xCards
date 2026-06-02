# Critical-path Coverage — Plan Brief

> Full plan: `context/changes/testing-critical-path-coverage/plan.md`
> Research: `context/changes/testing-critical-path-coverage/research.md`

## What & Why

We are protecting the critical path from AI generation into saved flashcards.
The goal is to prove the browser handoff and save endpoint still work without
adding new product behavior or provider-specific tests.

## Starting Point

The app already generates candidates into `localStorage`, shows them in the
review screen, and saves accepted cards through `save-flashcards`. What is
missing is direct coverage of the browser boundary and the persistence route,
even though the core AI and generation endpoint already have tests.

## Desired End State

When this plan is done, we can trust the generated-candidate handoff, the
review interaction flow, and the save endpoint at the cheapest useful layer.
A browser smoke should still show the full generate → review → save path, and
the handler should reject bad input or DB failures cleanly.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Scope | Tests only | Keeps this change aligned with the rollout goal instead of turning it into product debugging. | Research + user |
| Test mix | API handler unit tests + one focused component test | Best signal for the effort; covers the browser handoff and the save boundary without adding infra. | Research |
| Manual check | Quick generate → review → save smoke | Confirms the real browser path still works after automation. | Research + user |
| Handoff boundary | Include generate → review storage handoff | The localStorage seam is the weakest part of the critical path. | Research |
| Ownership/RLS | Leave for later | That area is already defended and belongs to a different rollout phase. | Research |

## Scope

**In scope:**

- `GenerateFlashcards` handoff tests
- `ReviewFlashcards` interaction tests
- `save-flashcards` handler tests
- A short browser smoke for the critical path

**Out of scope:**

- Supabase/Cloudflare provider-specific tests
- Ownership/RLS integration coverage
- Flashcard list/pagination work
- Product fixes for unrelated bugs surfaced during research

## Architecture / Approach

Use component tests to protect the browser-local `localStorage` handoff, then
route-handler tests to protect persistence and error handling. Keep the tests
at the boundary of existing code and reuse the current Vitest setup instead of
introducing new tooling.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Testing the browser handoff and review flow | Candidate storage, review interaction, and save-failure visibility | Browser state boundary breaks |
| 2. Testing the save-flashcards handler | Auth, validation, and DB error coverage for persistence | Bad saves or silent failures |

**Prerequisites:** The existing Vitest setup, jsdom environment, and the
research findings in `context/changes/testing-critical-path-coverage/research.md`.

**Estimated effort:** ~1-2 implementation sessions across 2 phases.

## Open Risks & Assumptions

- The review component is testable without changing production behavior.
- The save endpoint tests can mock Supabase cleanly at the route boundary.
- No additional phase is needed for ownership/RLS in this change.

## Success Criteria (Summary)

- The generate → review handoff is covered by tests.
- The review flow proves save success and save failure behavior.
- The save handler rejects invalid input and surfaces DB failures cleanly.
