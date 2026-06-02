import { createClient } from "@/lib/supabase";
import type { Flashcard } from "@/types";
import type { AstroCookies } from "astro";
import { applyRating } from "@/lib/scheduler";

// Helper: log Supabase errors for monitoring (per lessons.md)
function logSupabaseError(context: string, error: any) {
  console.error(`[Supabase] ${context}:`, error);
}

export async function getDueFlashcards(
  userId: string,
  limit = 10,
  requestHeaders?: Headers,
  cookies?: AstroCookies,
): Promise<{ data: Flashcard[]; error?: string }> {
  const supabase = createClient(requestHeaders!, cookies!);
  if (!supabase) return { data: [], error: "Supabase client not initialized" };

  const nowIso = new Date().toISOString();
  const { data: dueNow, error: errNow } = await supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", userId)
    .lte("due_date", nowIso)
    .order("due_date", { ascending: true })
    .limit(limit);

  if (errNow) logSupabaseError("getDueFlashcards.dueNow", errNow);

  let results: Flashcard[] = (dueNow as Flashcard[]) || [];

  if (results.length < limit) {
    const remaining = limit - results.length;
    const { data: nullDue, error: errNull } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .is("due_date", null)
      .order("created_at", { ascending: true })
      .limit(remaining);

    if (errNull) logSupabaseError("getDueFlashcards.nullDue", errNull);
    results = results.concat((nullDue as Flashcard[]) || []);
  }

  return { data: results || [], error: undefined };
}

export async function submitReview(
  userId: string,
  flashcardId: string,
  rating: number,
  requestHeaders?: Headers,
  cookies?: AstroCookies,
  idempotencyKey?: string | null,
): Promise<{ reviewId?: string; updatedFlashcardFields?: any; deduped?: boolean; error?: string }> {
  const supabase = createClient(requestHeaders!, cookies!);
  if (!supabase) return { error: "Supabase client not initialized" };

  try {
    // Server-side dedupe window (5s)
    const { data: last, error: lastErr } = await supabase
      .from("review_logs")
      .select("id, reviewed_at")
      .eq("user_id", userId)
      .eq("flashcard_id", flashcardId)
      .order("reviewed_at", { ascending: false })
      .limit(1);

    if (lastErr) logSupabaseError("submitReview.last", lastErr);
    if (last && (last as any).length) {
      const lr = (last as any)[0];
      const elapsedMs = Date.now() - new Date(lr.reviewed_at).getTime();
      if (elapsedMs >= 0 && elapsedMs < 5000) {
        return { reviewId: lr.id, deduped: true };
      }
    }

    // Load flashcard row
    const { data: cardRow, error: cardErr } = await supabase
      .from("flashcards")
      .select("*")
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .single();

    if (cardErr || !cardRow) {
      if (cardErr) logSupabaseError("submitReview.cardRow", cardErr);
      return { error: cardErr?.message || "Flashcard not found" };
    }

    // Compute next state via scheduler wrapper
    const { updatedFlashcardFields } = await applyRating(cardRow as Flashcard, rating);

    const p_next_state = {
      state: updatedFlashcardFields.state,
      stability: updatedFlashcardFields.stability,
      difficulty: updatedFlashcardFields.difficulty,
      reps: updatedFlashcardFields.reps,
      lapses: updatedFlashcardFields.lapses,
    };

    const p_next_due = updatedFlashcardFields.due_date || null;

    // Call DB RPC to persist atomically
    const rpcParams: any = {
      p_user_id: userId,
      p_flashcard_id: flashcardId,
      p_rating: rating,
      p_next_state: p_next_state,
      p_next_due: p_next_due,
      p_idempotency_key: idempotencyKey ?? null,
    };

    const { data: rpcData, error: rpcErr } = await supabase.rpc("record_review", rpcParams);
    if (rpcErr) {
      logSupabaseError("submitReview.rpc", rpcErr);
      return { error: rpcErr.message };
    }

    return { reviewId: rpcData ?? null, updatedFlashcardFields };
  } catch (e: any) {
    logSupabaseError("submitReview.exception", e);
    return { error: e?.message ?? String(e) };
  }
}
