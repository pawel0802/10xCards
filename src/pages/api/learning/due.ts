import type { APIRoute } from 'astro';
import { getDueFlashcards } from '@/lib/services/review';
import { createClient } from '@/lib/supabase';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const request = context.request;
  const user = context.locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(request.headers, context.cookies);
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase client not initialized' }), { status: 500 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.max(1, Math.min(100, Number(limitParam))) : 10;

  const { data, error } = await getDueFlashcards(user.id, limit, request.headers, context.cookies);
  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  return new Response(JSON.stringify({ data }), { status: 200 });
};
