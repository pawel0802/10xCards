---
change_id: testing-pagination-and-review-integration
title: Pagination and review integration
status: planned
created: 2026-06-09
updated: 2026-06-09
archived_at: null
---

## Notes

Phase 2 of context/foundation/test-plan.md: Pagination and review integration — Prove card list paging and review-session progression stay correct under churn.

Risks covered: #2 (Flashcard list pagination regresses) and #3 (Review sessions advance scheduling correctly).

Test types planned: integration.

Risk response intent:
- #2: Prove paging never drops/duplicates/misorders user-owned cards; challenge "first page looks right"; avoid snapshot-only list tests and over-mocking paging behavior.
- #3: Prove review sessions serve due cards in the right order and persist scheduling based on answers; challenge "finished session means scheduling was correct"; avoid asserting the scheduling formula from the implementation.
