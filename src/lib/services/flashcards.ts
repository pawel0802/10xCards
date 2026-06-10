import { createClient } from "@/lib/supabase";
import type { Flashcard, FlashcardUpdateDto } from "@/types";
import type { AstroCookies } from "astro";

// Helper: log Supabase errors for monitoring (per lessons.md)
function logSupabaseError(context: string, error: unknown) {
  // Replace with your preferred logging/monitoring solution
  console.error(`[Supabase] ${context}:`, error);
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
    .range(from, to)) as { data: Flashcard[] | null; count: number | null; error?: { message?: string } | null };
  const { data, count, error } = res;
  if (error) {
    // PostgREST returns PGRST103 when the requested range is outside available rows.
    // Treat that case as an empty page rather than an internal server error so clients can request higher pages safely.
    const errAny = error as any;
    const code = errAny?.code ?? errAny?.name ?? "";
    const msg = errAny?.message ?? "";
    if (code === "PGRST103" || (typeof msg === "string" && msg.includes("Requested range not satisfiable"))) {
      return { data: [], count: 0 };
    }
    logSupabaseError("getFlashcards", error);
    return { data: data ?? [], count: count ?? 0, error: error?.message };
  }
  return { data: data ?? [], count: count ?? 0 };
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
