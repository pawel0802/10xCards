import { test, expect, vi } from "vitest";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { GET } from "@/pages/api/flashcards";
import { POST as POST_REVIEW } from "@/pages/api/learning/review";
import * as supabaseModule from "@/lib/supabase";
import { randomUUID } from "crypto";

interface Flashcard {
  id: string;
  user_id: string;
}

interface ApiResponse {
  data: unknown[];
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TEST_EMAIL = process.env.INTEGRATION_TEST_USER;
const TEST_PASS = process.env.INTEGRATION_TEST_PASS;

const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY && TEST_EMAIL && TEST_PASS);

function randomId() {
  return randomUUID();
}

// Skip when integration env not configured
test.runIf(isConfigured)("ownership / RLS contract tests", { timeout: 120_000 }, async () => {
  const anonClient = createAnonClient(SUPABASE_URL ?? "", SUPABASE_KEY ?? "", { auth: { persistSession: false } });

  const authRes = await anonClient.auth.signInWithPassword({ email: TEST_EMAIL ?? "", password: TEST_PASS ?? "" });
  if (authRes.error) throw new Error(`Auth failed: ${authRes.error.message}`);
  const user = authRes.data.user;
  if (!user.id) throw new Error("Auth succeeded but no user id returned");
  const userId = user.id;

  const createClientSpy = vi.spyOn(supabaseModule, "createClient").mockImplementation(() => anonClient);

  // Seed two flashcards: one for current user, one for another user
  const baseTime = Date.now();
  const otherUserId = randomId();
  const toInsert = [
    {
      user_id: userId,
      front: "Owner Front 1",
      back: "Owner Back 1",
      created_at: new Date(baseTime).toISOString(),
      source: "test",
    },
    {
      user_id: otherUserId,
      front: "Other Front 1",
      back: "Other Back 1",
      created_at: new Date(baseTime + 1000).toISOString(),
      source: "test",
    },
  ];

  const insertRes = await anonClient.from("flashcards").insert(toInsert).select("id,user_id");
  if (insertRes.error) throw new Error(`Seed failed: ${insertRes.error.message}`);
  const inserted = insertRes.data as Flashcard[];
  const myCard = inserted.find((r) => r.user_id === userId);
  const otherCard = inserted.find((r) => r.user_id === otherUserId);
  const insertedIds = inserted.map((r) => r.id);
  console.log("[ownership-test] Inserted IDs:", insertedIds);

  try {
    // Call GET /api/flashcards as current user and ensure only own card is returned
    const url = "http://localhost/api/flashcards?page=1&pageSize=50";
    const req = new Request(url);
    const ctx = {
      request: req,
      locals: { user: { id: userId } },
      cookies: { get: () => undefined, set: () => undefined, delete: () => undefined },
    };
    const getRes = await GET(ctx as unknown as Parameters<typeof GET>[0]);
    expect(getRes.status).toBe(200);

    const body = (await getRes.json()) as unknown;
    const data = Array.isArray(body) ? body : (body as ApiResponse).data;
    const returnedIds = data.map((d) => (d as Flashcard).id);

    // Should include my card
    expect(returnedIds).toContain(myCard?.id);
    // Should NOT include other user's card
    expect(returnedIds).not.toContain(otherCard?.id);

    // Attempt to submit a review for the other user's card - should fail (not found / permission)
    if (otherCard) {
      const reviewBody = { flashcardId: otherCard.id, rating: 3 };
      const postReq = new Request("http://localhost/api/learning/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewBody),
      });
      const postCtx = {
        request: postReq,
        locals: { user: { id: userId } },
        cookies: { get: () => undefined, set: () => undefined, delete: () => undefined },
      };
      const postRes = await POST_REVIEW(postCtx as unknown as Parameters<typeof POST_REVIEW>[0]);
      const postBody = (await postRes.json()) as Record<string, unknown>;

      // Expect an error status (500 or 400) and error message indicating not found or permission denied
      expect(postRes.status).not.toBe(200);
      expect(postBody).toHaveProperty("error");
    }
  } finally {
    createClientSpy.mockRestore();
    if (insertedIds.length > 0) {
      try {
        await anonClient.from("review_logs").delete().in("flashcard_id", insertedIds);
      } catch {
        // ignore cleanup errors
      }
      try {
        await anonClient.from("flashcards").delete().in("id", insertedIds);
      } catch {
        // ignore cleanup errors
      }
    }
  }
});
