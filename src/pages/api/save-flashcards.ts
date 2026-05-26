import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";

const FlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});

const SaveFlashcardsSchema = z.object({
  cards: z.array(FlashcardSchema).min(1),
});

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const request = context.request;
  const user = context.locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const supabase = createClient(request.headers, context.cookies);
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase client not initialized" }), { status: 500 });
  }
  const body = await request.json();
  const parsed = SaveFlashcardsSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.issues }), { status: 400 });
  }
  const { cards } = parsed.data;
  // Store cards in Supabase (table: flashcards)
  const { error } = await supabase.from("flashcards").insert(
    cards.map((card: { front: string; back: string }) => ({
      user_id: user.id,
      front: card.front,
      back: card.back,
    })),
  );
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
