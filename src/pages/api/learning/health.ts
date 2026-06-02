import type { APIRoute } from "astro";
import type { Flashcard } from "@/types";
import { applyRating } from "@/lib/scheduler";

export const prerender = false;

export const GET: APIRoute = () => {
  try {
    // Smoke test the scheduler by applying a rating to a synthetic card
    const now = new Date().toISOString();
    const dummy: Partial<Flashcard> = {
      id: "health-dummy",
      user_id: "health",
      front: "Health check Q",
      back: "Health check A",
      source: "auto",
      due_date: now,
      state: 0,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      last_review: null,
      created_at: now,
      updated_at: now,
    };

    const result = applyRating(dummy, 3);
    // applyRating returns updatedFlashcardFields for all inputs; report success if it executed
    return new Response(
      JSON.stringify({
        status: "ok",
        scheduler: true,
        result: { updatedFlashcardFields: result.updatedFlashcardFields },
      }),
      { status: 200 },
    );
  } catch (e: unknown) {
    let msg = "Unknown error";
    if (typeof e === "object" && e !== null && "message" in e) {
      const em = (e as { message?: unknown }).message;
      msg = typeof em === "string" ? em : String(em);
    } else {
      msg = String(e);
    }
    return new Response(JSON.stringify({ status: "error", error: msg }), { status: 500 });
  }
};
