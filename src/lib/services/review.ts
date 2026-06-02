import { createClient } from "@/lib/supabase";
import type { Flashcard, ReviewLog } from "@/types";
import type { AstroCookies } from "astro";
import { applyRating } from "@/lib/scheduler";

// Helper: log Supabase errors for monitoring (per lessons.md)
function logSupabaseError(context: string, error: unknown): void {
  console.error(`[Supabase] ${context}:`, error);
}

export async function getDueFlashcards(
  userId: string,
  limit = 10,
  requestHeaders?: Headers,
  cookies?: AstroCookies,
): Promise<{ data: Flashcard[]; error?: string }> {
  if (!requestHeaders || !cookies) {
    return { data: [], error: "Missing request headers or cookies" };
  }
  const supabase = createClient(requestHeaders, cookies);
  if (!supabase) return { data: [], error: "Supabase client not initialized" };

  const nowIso = new Date().toISOString();
  const dueNowRes = (await supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", userId)
    .lte("due_date", nowIso)
    .order("due_date", { ascending: true })
    .limit(limit)) as { data: Flashcard[] | null; error?: unknown };
  const dueNow = dueNowRes.data;
  const errNow = dueNowRes.error;

  if (errNow) logSupabaseError("getDueFlashcards.dueNow", errNow);

  let results: Flashcard[] = dueNow ?? [];

  if (results.length < limit) {
    const remaining = limit - results.length;
    const nullDueRes = (await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .is("due_date", null)
      .order("created_at", { ascending: true })
      .limit(remaining)) as { data: Flashcard[] | null; error?: unknown };
    const nullDue = nullDueRes.data;
    const errNull = nullDueRes.error;

    if (errNull) logSupabaseError("getDueFlashcards.nullDue", errNull);
    results = results.concat(nullDue ?? []);
  }

  return { data: results, error: undefined };
}

export async function submitReview(
  userId: string,
  flashcardId: string,
  rating: number,
  requestHeaders?: Headers,
  cookies?: AstroCookies,
  idempotencyKey?: string | null,
): Promise<{ reviewId?: unknown; updatedFlashcardFields?: Partial<Flashcard>; deduped?: boolean; error?: string }> {
  if (!requestHeaders || !cookies) {
    return { error: "Missing request headers or cookies" };
  }
  const supabase = createClient(requestHeaders, cookies);
  if (!supabase) return { error: "Supabase client not initialized" };

  try {
    // Server-side dedupe window (5s)
    const lastRes = (await supabase
      .from("review_logs")
      .select("id, reviewed_at")
      .eq("user_id", userId)
      .eq("flashcard_id", flashcardId)
      .order("reviewed_at", { ascending: false })
      .limit(1)) as { data: ReviewLog[] | null; error?: unknown };
    const last = lastRes.data;
    const lastErr = lastRes.error;

    if (lastErr) logSupabaseError("submitReview.last", lastErr);
    if (last && last.length > 0) {
      const lr = last[0];
      const elapsedMs = Date.now() - new Date(lr.reviewed_at).getTime();
      if (elapsedMs >= 0 && elapsedMs < 5000) {
        return { reviewId: lr.id, deduped: true };
      }
    }

    // Load flashcard row
    const cardRowRes = (await supabase
      .from("flashcards")
      .select("*")
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .single()) as { data: Flashcard | null; error?: unknown };
    const cardRow = cardRowRes.data;
    const cardErr = cardRowRes.error;

    if (cardErr) {
      logSupabaseError("submitReview.cardRow", cardErr);
      const cardErrMessage = (cardErr as { message?: string }).message;
      return { error: cardErrMessage ?? "Flashcard not found" };
    }
    if (!cardRow) {
      return { error: "Flashcard not found" };
    }

    // Compute next state via scheduler wrapper
    const { updatedFlashcardFields } = applyRating(cardRow, rating) as {
      updatedFlashcardFields: Partial<Flashcard> & { due_date?: string | null; last_review?: string | null };
      reviewLogEntry?: unknown;
    };

    const p_next_state = {
      state: updatedFlashcardFields.state,
      stability: updatedFlashcardFields.stability,
      difficulty: updatedFlashcardFields.difficulty,
      reps: updatedFlashcardFields.reps,
      lapses: updatedFlashcardFields.lapses,
    };

    const p_next_due = updatedFlashcardFields.due_date ?? null;

    // Call DB RPC to persist atomically
    const rpcParams: Record<string, unknown> = {
      p_user_id: userId,
      p_flashcard_id: flashcardId,
      p_rating: rating,
      p_next_state: p_next_state,
      p_next_due: p_next_due,
      p_idempotency_key: idempotencyKey ?? null,
    };

    const rpcRes = (await supabase.rpc("record_review", rpcParams)) as { data?: unknown; error?: unknown };
    const rpcData = rpcRes.data;
    const rpcErr = rpcRes.error;
    if (rpcErr) {
      logSupabaseError("submitReview.rpc", rpcErr);
      const rpcErrMessage = (rpcErr as { message?: string }).message;
      const rpcErrString = typeof rpcErr === "string" ? rpcErr : JSON.stringify(rpcErr);
      return { error: rpcErrMessage ?? rpcErrString };
    }

    return { reviewId: rpcData ?? null, updatedFlashcardFields };
  } catch (e: unknown) {
    logSupabaseError("submitReview.exception", e);
    if (e instanceof Error) {
      return { error: e.message };
    }
    return { error: String(e) };
  }
}
