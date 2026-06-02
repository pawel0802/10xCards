import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import GenerateFlashcards from "./GenerateFlashcards";

let fetchMock: ReturnType<typeof vi.fn>;
let navigateMock: ReturnType<typeof vi.fn>;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();

  navigateMock = vi.fn();
  Object.defineProperty(window, "navigate", {
    value: navigateMock,
    configurable: true,
    writable: true,
  });

  fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          flashcards: [
            { front: "What is a flashcard?", back: "A study prompt and answer." },
            { front: "What is recall?", back: "Retrieving stored knowledge." },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
});

describe("GenerateFlashcards", () => {
  it("keeps the generate gate closed under 50 chars and stores candidates before navigating", async () => {
    render(<GenerateFlashcards />);

    const textarea = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /generate with ai/i });

    fireEvent.change(textarea, { target: { value: "x".repeat(49) } });
    expect(button).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "x".repeat(50) } });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(localStorage.getItem("reviewCandidates") ?? "[]") as {
      id: string;
      front: string;
      back: string;
    }[];

    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({
      front: "What is a flashcard?",
      back: "A study prompt and answer.",
    });
    expect(stored[1]).toMatchObject({
      front: "What is recall?",
      back: "Retrieving stored knowledge.",
    });
    expect(stored[0].id).toEqual(expect.any(String));
    expect(stored[1].id).toEqual(expect.any(String));

    await vi.advanceTimersByTimeAsync(500);
    expect(navigateMock).toHaveBeenCalledWith("/review");
  });
});
