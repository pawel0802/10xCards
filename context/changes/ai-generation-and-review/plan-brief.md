# AI Flashcard Generation & Review — Plan Brief

> Full plan: `context/changes/ai-generation-and-review/plan.md`

## What & Why
Enable users to paste text, generate flashcard candidates via AI, and review each card (accept/edit/reject) before adding to their deck. This boosts learning efficiency and user engagement by streamlining card creation.

## Starting Point
Schema/types for flashcards and review logs exist. No AI or review UI is present yet.

## Desired End State
Users can generate 5–10 flashcard candidates from pasted text, review each with granular controls, and add accepted cards instantly. Errors are handled gracefully, and the experience is smooth and responsive.

## Key Decisions Made
| Decision                | Choice                | Why (1 sentence)                        | Source |
|-------------------------|-----------------------|-----------------------------------------|--------|
| AI provider             | OpenRouter            | Fast, cost-effective, easy to configure | Plan   |
| Model selection         | Env-configurable      | Allows tuning for cost/performance      | Plan   |
| Input validation        | zod                   | Matches codebase/API conventions        | Plan   |
| Review flow             | Accept/edit/reject UI | Maximizes user control and quality      | Plan   |
| Batch size              | 5–10 cards/request    | Balances speed and review effort        | Plan   |

## Scope
**In scope:**
- AI-powered flashcard generation
- Per-card review (accept/edit/reject)
- Error handling and retry
- SSR API, React island UI

**Out of scope:**
- Custom SR algorithm
- File/document import
- Shared sets, Anki export
- Native mobile

## Architecture / Approach
OpenRouter service in `src/lib/services/`, SSR API endpoint with zod validation, React island for review UI, instant persistence for accepted cards, and robust error handling throughout.

## Phases at a Glance
| Phase     | What it delivers                | Key risk                  |
|-----------|--------------------------------|---------------------------|
| 1. AI Service Integration | OpenRouter service, env config      | Model/API mismatch         |
| 2. API Endpoint & Validation | SSR API, zod validation, error handling | Input/response errors      |
| 3. Review UI & UX         | Review UI, progress, error/retry   | UX edge cases              |
| 4. Persistence & Feedback | Storage, instant feedback          | Data loss, UI lag          |

**Prerequisites:** Schema/types present, Supabase ready
**Estimated effort:** ~2–3 sessions across 4 phases

## Open Risks & Assumptions
- OpenRouter API stability
- Model output quality
- UI/UX edge cases

## Success Criteria (Summary)
- Users can generate and review flashcards from pasted text
- Errors are handled gracefully, with retry
- Accepted cards are instantly added; rejected are discarded
