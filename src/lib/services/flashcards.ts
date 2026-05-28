import { createClient } from "@/lib/supabase";
import type { Flashcard, FlashcardCreateDto, FlashcardUpdateDto } from "@/types";
import type { AstroCookies } from "astro";

// Helper: log Supabase errors for monitoring (per lessons.md)
function logSupabaseError(context: string, error: any) {
  // Replace with your preferred logging/monitoring solution
  console.error(`[Supabase] ${context}:`, error);
}

export async function getFlashcards(userId: string, page = 1, pageSize = 10, requestHeaders: Headers, cookies: AstroCookies): Promise<{ data: Flashcard[]; count: number; error?: string }> {
  const supabase = createClient(requestHeaders, cookies);
  if (!supabase) {
    return { data: [], count: 0, error: "Supabase client not initialized" };
  }
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await supabase
    .from("flashcards")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) logSupabaseError("getFlashcards", error);
  return { data: data || [], count: count || 0, error: error?.message };

}

export async function updateFlashcard(userId: string, id: string, update: FlashcardUpdateDto, requestHeaders: Headers, cookies: AstroCookies): Promise<{ data?: Flashcard; error?: string }> {
  const supabase = createClient(requestHeaders, cookies);
  if (!supabase) {
    return { error: "Supabase client not initialized" };
  }
  const { data, error } = await supabase
    .from("flashcards")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) logSupabaseError("updateFlashcard", error);
  return { data: data as Flashcard, error: error?.message };

}

export async function deleteFlashcards(userId: string, ids: string[], requestHeaders: Headers, cookies: AstroCookies): Promise<{ count: number; error?: string }> {
  const supabase = createClient(requestHeaders, cookies);
  if (!supabase) {
    return { count: 0, error: "Supabase client not initialized" };
  }
  const { count, error } = await supabase
    .from("flashcards")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);
  if (error) logSupabaseError("deleteFlashcards", error);
  return { count: count || 0, error: error?.message };

}
