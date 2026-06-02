import { describe, it, expect } from "vitest";
import { applyRating } from "./scheduler";
import type { Flashcard } from "@/types";

describe("scheduler.applyRating", () => {
  it("increments reps and returns updated fields", () => {
    const card = {
      id: "1",
      user_id: "u",
      front: "Front",
      back: "Back",
      source: "auto",
      due_date: new Date().toISOString(),
      state: 0,
      stability: 1,
      difficulty: 1,
      reps: 0,
      lapses: 0,
      last_review: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Partial<Flashcard>;

    const res = applyRating(card, 3);
    expect(res).toBeDefined();
    expect(res.updatedFlashcardFields).toBeDefined();
    expect(typeof res.updatedFlashcardFields.reps).toBe("number");
    expect(res.updatedFlashcardFields.reps).toBeGreaterThanOrEqual(1);
  });
});
