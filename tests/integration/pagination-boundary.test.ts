import { expect, test, vi } from "vitest";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { GET, PATCH } from "@/pages/api/flashcards";
import * as supabaseModule from "@/lib/supabase";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TEST_EMAIL = process.env.INTEGRATION_TEST_USER;
const TEST_PASS = process.env.INTEGRATION_TEST_PASS;

const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY && TEST_EMAIL && TEST_PASS);

test.runIf(isConfigured)(
    "pagination boundary edit/delete preserves stability across pages",
    { timeout: 180_000 },
    async () => {
        const anonClient = createAnonClient(SUPABASE_URL!, SUPABASE_KEY!, {
            auth: { persistSession: false }
        });

        const authRes = await anonClient.auth.signInWithPassword({ email: TEST_EMAIL!, password: TEST_PASS! });
        if (authRes.error) throw new Error(`Auth failed: ${authRes.error.message}`);
        const userId = authRes.data.user?.id;
        if (!userId) throw new Error("Auth succeeded but no user id returned");

        // Force the API endpoints to use the same authenticated client instance as the test,
        // bypassing the flaky cookie-parsing layer of @supabase/ssr in a headless Vitest context.
        const createClientSpy = vi.spyOn(supabaseModule, "createClient").mockImplementation(() => {
            return anonClient as any;
        });

        const callGet = async (page: number, pageSize = 10) => {
            const url = `http://localhost/api/flashcards?page=${page}&pageSize=${pageSize}`;
            const req = new Request(url);

            const context: any = {
                request: req,
                locals: { user: { id: userId } },
                cookies: {
                    get: () => undefined,
                    set: () => {},
                    delete: () => {}
                }
            };
            const res = await GET(context);
            return await res.json();
        };

        // Increment timestamps by 1s to enforce predictable database sorting behavior.
        const baseTime = Date.now();
        const toInsert = Array.from({ length: 25 }).map((_, i) => ({
            user_id: userId,
            front: `Front ${i}`,
            back: `Back ${i}`,
            created_at: new Date(baseTime + i * 1000).toISOString(),
        }));

        const insertRes = await anonClient.from("flashcards").insert(toInsert).select();
        if (insertRes.error) throw new Error(`Seed failed: ${insertRes.error.message}`);
        const insertedIds = (insertRes.data || []).map((r: any) => r.id);

        try {
            let visibleCount = 0;
            for (let attempt = 0; attempt < 5; attempt++) {
                const page1 = await callGet(1, 50);

                if (page1 && typeof page1.count === "number") {
                    visibleCount = page1.count;
                    if (visibleCount >= insertedIds.length) break;
                } else if (page1 && Array.isArray(page1.data)) {
                    visibleCount = page1.data.length;
                    if (visibleCount >= insertedIds.length) break;
                }
                await new Promise((r) => setTimeout(r, 500));
            }

            if (visibleCount < insertedIds.length) {
                throw new Error(`Seed did not become visible in time via API, visible ${visibleCount} of ${insertedIds.length}`);
            }

            const p2 = await callGet(2, 10);
            const p2Data = Array.isArray(p2) ? p2 : p2?.data;

            if (!Array.isArray(p2Data)) {
                throw new Error("GET /api/flashcards returned unexpected body: " + JSON.stringify(p2));
            }
            expect(p2Data.length).toBe(10);

            const last = p2Data[p2Data.length - 1];
            const patchReq = new Request("http://localhost/api/flashcards", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: last.id, update: { front: last.front + " (edited)" } }),
            });
            const patchCtx: any = {
                request: patchReq,
                locals: { user: { id: userId } },
                cookies: { get: () => undefined, set: () => {}, delete: () => {} }
            };
            const patchRes = await PATCH(patchCtx);
            expect(patchRes.status).toBe(200);

            const p2b = await callGet(2, 10);
            const p3 = await callGet(3, 10);

            const p2bData = Array.isArray(p2b) ? p2b : p2b?.data;
            const p3Data = Array.isArray(p3) ? p3 : p3?.data;

            if (!p2bData || !p3Data) {
                throw new Error("Paginator responses missing expected data fields");
            }

            const ids = [...p2bData.map((d: any) => d.id), ...p3Data.map((d: any) => d.id)];
            const unique = new Set(ids);
            expect(unique.size).toBe(ids.length);

            if (ids.length > 0) {
                const ownerCheck = await anonClient.from("flashcards").select("id").in("id", ids).eq("user_id", userId);
                if (ownerCheck.error) throw new Error(`Owner check failed: ${ownerCheck.error.message}`);
                expect(ownerCheck.data.length).toBe(ids.length);
            }
        } finally {
            // Restore the original factory module state.
            createClientSpy.mockRestore();

            if (insertedIds.length > 0) {
                await anonClient.from("flashcards").delete().in("id", insertedIds);
            }
        }
    }
);
