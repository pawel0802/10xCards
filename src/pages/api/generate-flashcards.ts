import { z } from "zod";
import type { APIRoute } from "astro";

// Zod schema for input validation
const FlashcardInputSchema = z.object({
  text: z.string().min(1, "Text is required"),
  batchSize: z.number().min(1).max(10).default(5),
});

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();
    const parsed = FlashcardInputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Call AI service to generate flashcards
    try {
      const { generateFlashcardsFromText } = await import("@/lib/services/ai");
      const flashcards = await generateFlashcardsFromText(parsed.data.text);
      return new Response(JSON.stringify({ flashcards }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid request or server error.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
