import type { APIRoute } from "astro";
import { z } from "zod";
import { submitReview } from "@/lib/services/review";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const ReviewSchema = z.object({
  flashcardId: z.uuid(),
  rating: z.number().int().min(1).max(4),
  idempotencyKey: z.string().optional(),
});

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
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input", details: z.treeifyError(parsed.error) }), {
      status: 400,
    });
  }

  const { flashcardId, rating, idempotencyKey } = parsed.data;
  const result = await submitReview(
    user.id,
    flashcardId,
    rating,
    request.headers,
    context.cookies,
    idempotencyKey ?? null,
  );

  if (result.error) {
    return new Response(JSON.stringify({ error: result.error }), { status: 500 });
  }

  return new Response(JSON.stringify({ reviewId: result.reviewId, deduped: result.deduped ?? false }), { status: 200 });
};
