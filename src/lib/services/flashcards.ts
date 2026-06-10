import { createClient } from "@/lib/supabase";
import type { Flashcard, FlashcardUpdateDto } from "@/types";
import type { AstroCookies } from "astro";

// Helper: log Supabase errors for monitoring (per lessons.md)
function logSupabaseError(context: string, error: unknown) {
  // Replace with your preferred logging/monitoring solution
  console.error(`[Supabase] ${context}:`, error);
}

type SupaError = { message?: string; code?: string; name?: string } | null;
interface RangeResponse<T> {
  data: T | null;
  count: number | null;
  error?: SupaError;
}

export async function getFlashcards(
  userId: string,
  page = 1,
  pageSize = 10,
  requestHeaders: Headers,
  cookies: AstroCookies,
): Promise<{ data: Flashcard[]; count: number; error?: string }> {
  const supabase = createClient(requestHeaders, cookies);
  if (!supabase) {
    return { data: [], count: 0, error: "Supabase client not initialized" };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const res = (await supabase
    .from("flashcards")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to)) as RangeResponse<Flashcard[]>;

  if (res.error) {
    const err = res.error;
    const code = err.code ?? err.name ?? "";
    const msg = err.message ?? "";

    if (code === "PGRST103" || (typeof msg === "string" && msg.includes("Requested range not satisfiable"))) {
      // Determine an accurate count and return empty data for out-of-range page
      const countRes = (await supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)) as { count: number | null; error?: SupaError };

      if (countRes.error) {
        logSupabaseError("getFlashcards.count", countRes.error);
        return { data: [], count: 0, error: err.message };
      }

      return { data: [], count: countRes.count ?? 0 };
    }

    logSupabaseError("getFlashcards", res.error);
    return { data: res.data ?? [], count: res.count ?? 0, error: err.message };
  }

  return { data: res.data ?? [], count: res.count ?? 0 };
}

export async function updateFlashcard(
  userId: string,
  id: string,
  update: FlashcardUpdateDto,
  requestHeaders: Headers,
  cookies: AstroCookies,
): Promise<{ data?: Flashcard; error?: string }> {
  const supabase = createClient(requestHeaders, cookies);
  if (!supabase) {
    return { error: "Supabase client not initialized" };
  }
  const res = (await supabase
    .from("flashcards")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()) as { data: Flashcard | null; error?: { message?: string } | null };
  const { data, error } = res;
  if (error) logSupabaseError("updateFlashcard", error);
  return { data: data ?? undefined, error: error?.message };
}

export async function deleteFlashcards(
  userId: string,
  ids: string[],
  requestHeaders: Headers,
  cookies: AstroCookies,
): Promise<{ count: number; error?: string }> {
  const supabase = createClient(requestHeaders, cookies);
  if (!supabase) {
    return { count: 0, error: "Supabase client not initialized" };
  }
  const res = (await supabase.from("flashcards").delete().eq("user_id", userId).in("id", ids)) as {
    count: number | null;
    error?: { message?: string } | null;
  };
  const { count, error } = res;
  if (error) logSupabaseError("deleteFlashcards", error);
  return { count: count ?? 0, error: error?.message };
}
