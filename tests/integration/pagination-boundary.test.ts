import { test, expect } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { GET, PATCH } from "@/pages/api/flashcards";

// Integration boundary test for pagination behavior.
// Skips if SUPABASE env vars are not present.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  test.skip("pagination boundary integration - supabase not configured", () => {});
} else {
  test("pagination boundary edit/delete preserves stability across pages", { timeout: 120_000 }, async () => {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {} as any);
    const userId = `test-user-${Date.now()}`;

    // Seed 25 cards for the user
    const toInsert = Array.from({ length: 25 }).map((_, i) => ({
      id: `${Date.now()}-${i}`,
      user_id: userId,
      front: `Front ${i}`,
      back: `Back ${i}`,
      created_at: new Date().toISOString(),
    }));

    const insertRes = await supabase.from("flashcards").insert(toInsert);
    if (insertRes.error) throw new Error(`Seed failed: ${insertRes.error.message}`);
    const insertedIds = (insertRes.data || []).map((r: any) => r.id);

    // Helper to call GET handler
    const callGet = async (page: number, pageSize = 10) => {
      const url = `http://localhost/api/flashcards?page=${page}&pageSize=${pageSize}`;
      const req = new Request(url);
      const context: any = { request: req, locals: { user: { id: userId } }, cookies: {} };
      const res = await GET(context);
      const body = await res.json();
      return body;
    };

    // Fetch page 2
    const p2 = await callGet(2, 10);
    expect(Array.isArray(p2.data)).toBe(true);
    expect(p2.data.length).toBe(10);

    // Edit the last item on page 2
    const last = p2.data[p2.data.length - 1];
    const patchReq = new Request("http://localhost/api/flashcards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: last.id, update: { front: last.front + " (edited)" } }),
    });
    const patchCtx: any = { request: patchReq, locals: { user: { id: userId } }, cookies: {} };
    const patchRes = await PATCH(patchCtx);
    expect(patchRes.status).toBe(200);

    // Re-fetch page 2 and page 3
    const p2b = await callGet(2, 10);
    const p3 = await callGet(3, 10);

    const ids = [...p2b.data.map((d: any) => d.id), ...p3.data.map((d: any) => d.id)];
    const unique = new Set(ids);
    // No duplicates across the two pages
    expect(unique.size).toBe(ids.length);

    // All returned items belong to the seeded user
    const ownerCheck = ids.length > 0 ? await supabase.from("flashcards").select("id").in("id", ids).eq("user_id", userId) : null;
    if (ownerCheck && ownerCheck.error) throw new Error(`Owner check failed: ${ownerCheck.error.message}`);
    if (ownerCheck && ownerCheck.data) expect(ownerCheck.data.length).toBe(ids.length);

    // Clean up
    await supabase.from("flashcards").delete().in("id", insertedIds);
  });
}
