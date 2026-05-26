# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Error logging for backend failures

**Context:** src/pages/api/save-flashcards.ts:34–43

**Problem:** Handles Supabase errors, but does not log or alert on repeated failures. This can make it hard to detect persistent backend issues in production.

**Rule:** For all supabase operations that failed, there should be a log entry for monitoring purposes.

**Applies to:** All source files where operation on supabase is performed

