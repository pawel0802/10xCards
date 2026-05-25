# AI Flashcard Generation & Review Implementation Plan

## Overview

This plan delivers AI-powered flashcard generation from pasted text, with granular review (accept/edit/reject) for each candidate card, and robust error handling. It integrates OpenRouter for AI, follows codebase conventions, and ensures a smooth, user-friendly review flow.

## Implementation Phases:
1. **AI Service Integration** – Add OpenRouter integration, env-configurable model, and service logic for flashcard generation.
2. **API Endpoint & Validation** – Expose a zod-validated API route for flashcard generation, SSR-only, with error handling and batch size limits.
3. **Review UI & UX** – Build the React island for candidate review (accept/edit/reject), spinner/progress, error/retry, and navigation warning.
4. **Persistence & Feedback** – Wire up accepted cards to storage, discard rejected, and ensure instant feedback in the UI.

---

## Progress

### Phase 1: AI Service Integration
#### Automated
- [x] 1.1 Service code and env config present
- [x] 1.2 Unit tests for service logic
#### Manual
- [x] 1.3 Manual test: AI returns plausible cards

### Phase 2: API Endpoint & Validation
#### Automated
- [ ] 2.1 API route exists, SSR only
- [ ] 2.2 Zod validation enforced
- [ ] 2.3 Error handling tested
#### Manual
- [ ] 2.4 Manual test: API rejects invalid input

### Phase 3: Review UI & UX
#### Automated
- [ ] 3.1 React island renders, disables form during generation
- [ ] 3.2 Spinner/progress shown
- [ ] 3.3 Error/retry logic works
#### Manual
- [ ] 3.4 Manual test: Accept/edit/reject flow
- [ ] 3.5 Navigation warning triggers

### Phase 4: Persistence & Feedback
#### Automated
- [ ] 4.1 Accepted cards stored
- [ ] 4.2 Rejected cards discarded
#### Manual
- [ ] 4.3 Manual test: UI updates instantly
