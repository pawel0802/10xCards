---
change_id: flashcard-data-schema
title: Define flashcard and review schema with RLS
status: archived
created: 2026-05-25
updated: 2026-06-11
archived_at: 2026-06-11T10:02:14Z
---

## Notes

F-01 from `context/foundation/roadmap.md`. Foundation that unlocks S-01, S-02, S-03 (and S-04 indirectly).

Scope: create Supabase migration with `flashcards` and `review_logs` tables, enable RLS with per-user policies (insert/select/update/delete), and expose TypeScript types in `src/types.ts`.

Key risk noted in roadmap: include SR scheduling columns (`due_date`, `ease_factor`, `interval`) upfront so S-04 doesn't require a breaking migration later.
