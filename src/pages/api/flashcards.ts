import type { APIRoute } from "astro";
import { z } from "zod";
import { getFlashcards, updateFlashcard, deleteFlashcards } from "@/lib/services/flashcards";

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(10),
});

const PatchSchema = z.object({
  id: z.string().min(1),
  update: z.object({
    front: z.string().min(1).max(300).optional(),
    back: z.string().min(1).max(300).optional(),
  }),
});

const DeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const url = new URL(context.request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid query", details: z.treeifyError(parsed.error) }), {
      status: 400,
    });
  }
  const { page, pageSize } = parsed.data;
  const { data, count, error } = await getFlashcards(user.id, page, pageSize, context.request.headers, context.cookies);
  if (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
  return new Response(JSON.stringify({ data, count }), { status: 200 });
};

export const PATCH: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const body = await context.request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input", details: z.treeifyError(parsed.error) }), {
      status: 400,
    });
  }
  const { id, update } = parsed.data;
  const { data, error } = await updateFlashcard(user.id, id, update, context.request.headers, context.cookies);
  if (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
  return new Response(JSON.stringify({ data }), { status: 200 });
};

export const DELETE: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const body = await context.request.json();
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input", details: z.treeifyError(parsed.error) }), {
      status: 400,
    });
  }
  const { ids } = parsed.data;
  const { count, error } = await deleteFlashcards(user.id, ids, context.request.headers, context.cookies);
  if (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
  return new Response(JSON.stringify({ count }), { status: 200 });
};
