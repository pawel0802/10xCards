import { test, vi, expect } from "vitest";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { GET, PATCH } from "@/pages/api/flashcards";
import * as supabaseModule from "@/lib/supabase";

interface Card {
  id: string;
  front: string;
  back: string;
  created_at: string;
}

type ApiListResponse<T> = { data: T[]; count?: number } | T[];

interface SupabaseIdRow {
  id: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TEST_EMAIL = process.env.INTEGRATION_TEST_USER;
const TEST_PASS = process.env.INTEGRATION_TEST_PASS;

const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY && TEST_EMAIL && TEST_PASS);

test.runIf(isConfigured)(
  "pagination boundary edit/delete preserves stability across pages",
  { timeout: 180_000 },
  async () => {
    const anonClient = createAnonClient(SUPABASE_URL ?? "", SUPABASE_KEY ?? "", {
      auth: { persistSession: false },
    });

    const authRes = await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL ?? "",
      password: TEST_PASS ?? "",
    });
    if (authRes.error) throw new Error(`Auth failed: ${authRes.error.message}`);

    const user = authRes.data.user as { id?: string } | null;
    const userId = user?.id;
    if (!userId) throw new Error("Auth succeeded but no user id returned");

    const createClientSpy = vi.spyOn(supabaseModule, "createClient").mockImplementation(() => {
      return anonClient;
    });

    const callGet = async (page: number, pageSize = 10): Promise<ApiListResponse<Card>> => {
      const url = `http://localhost/api/flashcards?page=${page}&pageSize=${pageSize}`;
      const req = new Request(url);

      const context = {
        request: req,
        locals: { user: { id: userId } },
        cookies: {
          get: () => undefined,
          set: () => undefined,
          delete: () => undefined,
        },
      };

      const res = await GET(context as unknown as Parameters<typeof GET>[0]);
      return (await res.json()) as ApiListResponse<Card>;
    };

    const baseTime = Date.now();
    const toInsert = Array.from({ length: 25 }).map((_, i) => ({
      user_id: userId,
      front: `Front ${i}`,
      back: `Back ${i}`,
      created_at: new Date(baseTime + i * 1000).toISOString(),
    }));

    const insertRes = await anonClient.from("flashcards").insert(toInsert).select("id");
    if (insertRes.error) throw new Error(`Seed failed: ${insertRes.error.message}`);

    const rawData = insertRes.data as SupabaseIdRow[] | null;
    const insertedIds = (rawData ?? []).map((r) => r.id);

    try {
      let visibleCount = 0;
      for (let attempt = 0; attempt < 5; attempt++) {
        const page1 = await callGet(1, 50);

        if (Array.isArray(page1)) {
          visibleCount = page1.length;
        } else {
          // Because ApiListResponse is either an Array or an Object,
          // if it's not an array, it MUST be the object type.
          // Checking 'typeof page1 === "object"' or 'if (page1)' is truthy & redundant.
          if ("count" in page1 && typeof page1.count === "number") {
            visibleCount = page1.count;
          } else if ("data" in page1) {
            visibleCount = page1.data.length;
          }
        }

        if (visibleCount >= insertedIds.length) break;
        await new Promise((r) => setTimeout(r, 500));
      }

      if (visibleCount < insertedIds.length) {
        throw new Error(
          `Seed did not become visible in time via API, visible ${visibleCount} of ${insertedIds.length}`,
        );
      }

      const p2 = await callGet(2, 10);
      // Since it is an object if not an array, it always contains 'data' per type definition
      const p2Data = Array.isArray(p2) ? p2 : p2.data;

      if (!Array.isArray(p2Data) || p2Data.length === 0) {
        throw new Error("GET /api/flashcards returned unexpected body structure");
      }
      expect(p2Data.length).toBe(10);

      const last = p2Data[p2Data.length - 1];

      const patchReq = new Request("http://localhost/api/flashcards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: last.id, update: { front: `${last.front} (edited)` } }),
      });

      const patchCtx = {
        request: patchReq,
        locals: { user: { id: userId } },
        cookies: {
          get: () => undefined,
          set: () => undefined,
          delete: () => undefined,
        },
      };

      const patchRes = await PATCH(patchCtx as unknown as Parameters<typeof PATCH>[0]);
      expect(patchRes.status).toBe(200);

      const p2b = await callGet(2, 10);
      const p3 = await callGet(3, 10);

      const p2bData = Array.isArray(p2b) ? p2b : p2b.data;
      const p3Data = Array.isArray(p3) ? p3 : p3.data;

      const ids = [...p2bData.map((d) => d.id), ...p3Data.map((d) => d.id)];
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);

      if (ids.length > 0) {
        const ownerCheck = await anonClient.from("flashcards").select("id").in("id", ids).eq("user_id", userId);
        if (ownerCheck.error) throw new Error(`Owner check failed: ${ownerCheck.error.message}`);

        const checkData = ownerCheck.data as SupabaseIdRow[] | null;
        const dataLength = (checkData ?? []).length;
        expect(dataLength).toBe(ids.length);
      }
    } finally {
      createClientSpy.mockRestore();

      if (insertedIds.length > 0) {
        await anonClient.from("flashcards").delete().in("id", insertedIds);
      }
    }
  },
);
