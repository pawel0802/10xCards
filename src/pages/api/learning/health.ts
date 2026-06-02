import type { APIRoute } from "astro";
import { applyRating } from "@/lib/scheduler";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // Smoke test the scheduler by applying a rating to a synthetic card
    const now = new Date().toISOString();
    const dummy = {
      id: "health-dummy",
      user_id: "health",
      front: "Health check Q",
      back: "Health check A",
      source: "system",
      due_date: now,
      state: 0,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      last_review: null,
      created_at: now,
      updated_at: now,
    } as any;

    const result = await applyRating(dummy, 3);
    const ok = !!result?.updatedFlashcardFields;
    return new Response(JSON.stringify({ status: ok ? "ok" : "fail", scheduler: ok }), { status: ok ? 200 : 500 });
  } catch (e: any) {
    return new Response(JSON.stringify({ status: "error", error: e?.message ?? String(e) }), { status: 500 });
  }
};
