// Shared entity and DTO types for 10xCards.
// Hand-written per AGENTS.md convention — do not replace with supabase gen types.

// ============================================================
// Entities (mirror public.flashcards and public.review_logs)
// ============================================================

export interface Flashcard {
  id: string;
  user_id: string;
  front: string;
  back: string;
  source: "auto" | "manual" | "hybrid";
  due_date: string; // ISO 8601 timestamptz from Supabase JS
  state: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  last_review?: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface ReviewLog {
  id: string;
  user_id: string;
  flashcard_id: string;
  rating: 1 | 2 | 3 | 4; // 1=Again 2=Hard 3=Good 4=Easy
  prior_state?: Record<string, unknown>;
  elapsed_days?: number | null;
  scheduled_days?: number | null;
  reviewed_at: string; // ISO 8601
  idempotency_key?: string | null;
}

// ============================================================
// DTOs (API layer — used by S-01 through S-04)
// ============================================================

/** Used by S-01 (AI generation) and S-02 (manual creation) */
export type FlashcardCreateDto = Pick<Flashcard, "front" | "back" | "source">;

/**
 * Used by user-facing card edit.
 * SR fields (due_date, interval_days, ease_factor, repetitions) are intentionally
 * excluded — those are managed by the SR engine in S-04.
 */
export type FlashcardUpdateDto = Partial<Pick<Flashcard, "front" | "back">>;

/** Used by S-04 (spaced repetition review submission) */
export type ReviewLogCreateDto = Pick<ReviewLog, "flashcard_id" | "rating">;
