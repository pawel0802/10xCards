import { test, expect, vi } from "vitest";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { GET } from "@/pages/api/learning/due";
import { POST } from "@/pages/api/learning/review";
import * as supabaseModule from "@/lib/supabase";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TEST_EMAIL = process.env.INTEGRATION_TEST_USER;
const TEST_PASS = process.env.INTEGRATION_TEST_PASS;
const KEEP_TEST_DATA = process.env.INTEGRATION_DEBUG === "true" || process.env.KEEP_INTEGRATION_DATA === "true";

const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY && TEST_EMAIL && TEST_PASS);

// Skip when integration env not configured
test.runIf(isConfigured)(
  "review scheduling: due-listing and review result persistence",
  { timeout: 180_000 },
  async () => {
    const anonClient = createAnonClient(SUPABASE_URL ?? "", SUPABASE_KEY ?? "", { auth: { persistSession: false } });

    const authRes = await anonClient.auth.signInWithPassword({ email: TEST_EMAIL ?? "", password: TEST_PASS ?? "" });
    if (authRes.error) throw new Error(`Auth failed: ${authRes.error.message}`);
    const user = authRes.data.user as { id?: string } | null;
    const userId = user?.id;
    if (!userId) throw new Error("Auth succeeded but no user id returned");

    const createClientSpy = vi.spyOn(supabaseModule, "createClient").mockImplementation(() => anonClient as any);

    // Seed 3 due flashcards for this user
    const baseTime = Date.now() - 1000 * 60 * 60; // 1 hour ago
    const toInsert = Array.from({ length: 3 }).map((_, i) => ({
      user_id: userId,
      front: `Due Front ${i}`,
      back: `Due Back ${i}`,
      created_at: new Date(baseTime + i * 1000).toISOString(),
      due_date: new Date(baseTime - i * 1000).toISOString(),
      source: "test",
    }));

    const insertRes = await anonClient.from("flashcards").insert(toInsert).select("id");
    if (insertRes.error) throw new Error(`Seed failed: ${insertRes.error.message}`);
    const inserted = (insertRes.data ?? []) as { id: string }[];
    const insertedIds = inserted.map((r) => r.id);

    console.log("[integration-test] Inserted flashcard IDs:", insertedIds);

    try {
      // Poll GET /api/learning/due until seeded IDs visible (avoid eventual consistency flakes)
      const callGet = async () => {
        const url = `http://localhost/api/learning/due?limit=10`;
        const req = new Request(url);
        const ctx = { request: req, locals: { user: { id: userId } }, cookies: { get: () => undefined, set: () => undefined, delete: () => undefined } };
        const getRes = await GET(ctx as unknown as Parameters<typeof GET>[0]);
        const body = await getRes.json();
        return { status: getRes.status, body } as const;
      };

      let body: any = null;
      let getStatus = 0;
      for (let attempt = 0; attempt < 10; attempt++) {
        const r = await callGet();
        getStatus = r.status;
        body = r.body;
        console.log(`[integration-test] GET attempt ${attempt}, status=${getStatus}, dataCount=${(body && body.data && body.data.length) || 0}`);
        const dueIds = (body && body.data && body.data.map((d: any) => d.id)) || [];
        if (insertedIds.every((id) => dueIds.includes(id))) break;
        await new Promise((r) => setTimeout(r, 500));
      }

      expect(getStatus).toBe(200);
      expect(body).toHaveProperty("data");
      const data = body.data as Array<{ id: string; due_date?: string }>;

      // Ensure seeded IDs appear in due list
      const dueIds = data.map((d) => d.id);
      insertedIds.forEach((id) => expect(dueIds).toContain(id));

      // Assert ordering by due_date asc
      const dueTimes = data.map((d) => (d.due_date ? new Date(d.due_date).getTime() : Number.POSITIVE_INFINITY));
      for (let i = 1; i < dueTimes.length; i++) {
        expect(dueTimes[i]).toBeGreaterThanOrEqual(dueTimes[i - 1]);
      }

      // Read current due_date for first card
      const beforeCard = await anonClient.from("flashcards").select("due_date").eq("id", insertedIds[0]).single();
      if (beforeCard.error) throw new Error(`flashcard select (before) failed: ${beforeCard.error.message}`);
      const beforeDue = beforeCard.data?.due_date ?? null;
      console.log("[integration-test] before due_date:", beforeDue);

      // POST a review for the first card
      const reviewBody = { flashcardId: insertedIds[0], rating: 4 };
      const postReq = new Request("http://localhost/api/learning/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reviewBody) });
      const postCtx = { request: postReq, locals: { user: { id: userId } }, cookies: { get: () => undefined, set: () => undefined, delete: () => undefined } };
      const postRes = await POST(postCtx as unknown as Parameters<typeof POST>[0]);
      const postData = await postRes.json();
      console.log("[integration-test] POST response:", postRes.status, postData);
      expect(postRes.status).toBe(200);
      expect(postData).toHaveProperty("reviewId");

      // Verify review_log exists
      const rl = await anonClient.from("review_logs").select("id").eq("flashcard_id", insertedIds[0]).eq("user_id", userId);
      if (rl.error) throw new Error(`review_log check failed: ${rl.error.message}`);
      const rlData = rl.data as { id: string }[] | null;
      expect(rlData && rlData.length > 0).toBe(true);

      // Verify flashcard due_date was updated (non-null and changed)
      const cardRes = await anonClient.from("flashcards").select("due_date").eq("id", insertedIds[0]).single();
      if (cardRes.error) throw new Error(`flashcard select failed: ${cardRes.error.message}`);
      const card = cardRes.data as { due_date?: string | null } | null;
      console.log("[integration-test] after due_date:", card?.due_date);
      expect(card).not.toBeNull();
      expect(card?.due_date).not.toBeNull();
      if (beforeDue !== null) {
        expect(new Date(card!.due_date!).getTime()).not.toBe(new Date(beforeDue).getTime());
      }
    } finally {
      createClientSpy.mockRestore();
      if (insertedIds.length > 0) {
        if (KEEP_TEST_DATA) {
          console.log("[integration-test] KEEP_TEST_DATA=true, leaving seeded rows in DB for debugging:", insertedIds);
        } else {
          // Clean review_logs and flashcards
          await anonClient.from("review_logs").delete().in("flashcard_id", insertedIds);
          await anonClient.from("flashcards").delete().in("id", insertedIds);
          console.log("[integration-test] Cleaned seeded rows");
        }
      }
    }
  },
);

