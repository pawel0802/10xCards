import { describe, expect, it, vi } from "vitest";

interface GenerateFlashcardsBody {
  text?: unknown;
  batchSize?: unknown;
}

interface ValidationErrorResponse {
  error?: string;
  details?: {
    fieldErrors?: {
      text?: string[];
      batchSize?: string[];
    };
    formErrors?: string[];
  };
}

interface GenerateFlashcardsSuccessResponse {
  flashcards: { front: string; back: string }[];
}

const generateFlashcardsFromText = vi.fn((text: string) => {
  if (text === "fail") {
    throw new Error("fail");
  }

  return [{ front: "Q", back: "A" }];
});

vi.mock("@/lib/services/ai", () => ({
  generateFlashcardsFromText,
}));

const handler = async (body: GenerateFlashcardsBody, requestOverrides?: { json?: () => Promise<unknown> }) => {
  const { POST } = await import("./generate-flashcards");

  const request = new Request("http://localhost/api/generate-flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (requestOverrides?.json) {
    Object.defineProperty(request, "json", {
      value: requestOverrides.json,
    });
  }

  return POST({ request });
};

describe("POST /api/generate-flashcards", () => {
  it("returns 400 for missing text", async () => {
    const res = await handler({});
    expect(res.status).toBe(400);

    const data = (await res.json()) as ValidationErrorResponse;
    if (data.details) {
      const msg = data.details.fieldErrors?.text?.[0] ?? data.details.formErrors?.[0];
      expect(msg).toMatch(/expected string|required|undefined/i);
    } else {
      expect(typeof data.error).toBe("string");
    }
  });

  it("returns 400 for empty text", async () => {
    const res = await handler({ text: "" });
    expect(res.status).toBe(400);

    const data = (await res.json()) as ValidationErrorResponse;
    if (data.details) {
      const msg = data.details.fieldErrors?.text?.[0] ?? data.details.formErrors?.[0];
      expect(msg).toMatch(/required/i);
    } else {
      expect(typeof data.error).toBe("string");
    }
  });

  it("returns 400 for invalid batchSize", async () => {
    const res = await handler({ text: "foo", batchSize: 0 });
    expect(res.status).toBe(400);

    const data = (await res.json()) as ValidationErrorResponse;
    if (data.details) {
      const msg = data.details.fieldErrors?.batchSize?.[0] ?? data.details.formErrors?.[0];
      expect(msg).toMatch(/expected number to be >=1/i);
    } else {
      expect(typeof data.error).toBe("string");
    }
  });

  it("returns 200 and flashcards for valid input", async () => {
    const res = await handler({ text: "foo", batchSize: 2 });
    expect(res.status).toBe(200);

    const data = (await res.json()) as GenerateFlashcardsSuccessResponse;
    expect(Array.isArray(data.flashcards)).toBe(true);
    expect(data.flashcards[0]).toEqual({ front: "Q", back: "A" });
  });

  it("returns 500 if AI service throws", async () => {
    const res = await handler({ text: "fail" });
    expect(res.status).toBe(500);

    const data = (await res.json()) as { error?: string };
    expect(data.error).toBe("fail");
  });

  it("returns 500 for invalid JSON body", async () => {
    const res = await handler(
      { text: "foo" },
      {
        json: () => Promise.reject(new Error("bad json")),
      },
    );

    expect(res.status).toBe(500);
    const data = (await res.json()) as { error?: string };
    expect(data.error).toMatch(/invalid request/i);
  });
});
