import { describe, it, vi, expect, afterEach } from "vitest";
import type { APIContext } from "astro"; // Native type import from Astro
import { POST } from "./save-flashcards";

interface ErrorResponse {
  error?: string;
  details?: unknown;
  success?: boolean;
}

// Supabase database mock configuration
const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockSupabaseClient = { from: mockFrom };

let isClientValid = false;

vi.mock("@/lib/supabase", () => ({
  createClient: (_headers: Headers, _cookies: unknown) => (isClientValid ? mockSupabaseClient : null),
}));

// Helper function to build a safe Astro context for testing purposes
const handler = async (body: unknown, user?: { id: string } | null) => {
  const request = new Request("http://localhost/api/save-flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Explicitly map the locals structure (matching your env.d.ts in Astro)
  const locals = {
    user: user ?? undefined,
  };

  // Safe cookies mock with basic methods
  const cookies = {
    get: () => undefined,
    has: () => false,
    set: () => {
      /* no-op for testing purposes */
    },
    delete: () => {
      /* no-op for testing purposes */
    },
    getAll: () => [],
    headers: () => new Headers(), // Correct initialization of a native Headers object
  };

  // Safe casting through 'unknown' to the target 'APIContext'.
  // Fixes the TS2740 error without using the 'any' type for variables and parameters.
  const context = {
    request,
    locals,
    cookies,
    url: new URL(request.url),
    params: {},
    props: {},
    redirect: (path: string) => new Response(null, { status: 302, headers: { Location: path } }),
  } as unknown as APIContext;

  return POST(context);
};

afterEach(() => {
  vi.resetAllMocks(); // Resets mock history and state to prevent call count leaks between tests
  isClientValid = false;
});

describe("POST /api/save-flashcards", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await handler({ cards: [{ front: "F", back: "B" }] }, null);

    expect(res.status).toBe(401);
    const data = (await res.json()) as ErrorResponse;
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid payload", async () => {
    isClientValid = true;
    mockInsert.mockResolvedValue({ error: null });

    const res = await handler({ cards: [] }, { id: "user-1" });

    expect(res.status).toBe(400);
    const data = (await res.json()) as ErrorResponse;
    expect(data.error).toMatch(/Invalid input/i);
    expect(data.details).toBeDefined();
  });

  it("returns 500 when DB insert fails", async () => {
    isClientValid = true;
    mockInsert.mockResolvedValue({ error: { message: "boom" } });

    const res = await handler({ cards: [{ front: "F", back: "B" }] }, { id: "user-1" });

    expect(res.status).toBe(500);
    const data = (await res.json()) as ErrorResponse;
    expect(data.error).toBe("boom");
  });

  it("returns 200 on success and inserts correct payload", async () => {
    isClientValid = true;
    mockInsert.mockResolvedValue({ error: null });

    const payload = { cards: [{ front: "F", back: "B" }] };
    const res = await handler(payload, { id: "user-1" });

    expect(res.status).toBe(200);
    const data = (await res.json()) as ErrorResponse;
    expect(data.success).toBe(true);

    // Verify data integrity, including the automatically appended "source" field
    expect(mockFrom).toHaveBeenCalledWith("flashcards");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith([{ front: "F", back: "B", user_id: "user-1", source: "auto" }]);
  });
});
