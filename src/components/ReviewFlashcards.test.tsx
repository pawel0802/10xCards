import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import ReviewFlashcards from "./ReviewFlashcards";

interface Candidate {
  id: string;
  front: string;
  back: string;
  status?: "accepted" | "rejected" | "edited";
}

let fetchMock: ReturnType<typeof vi.fn>;
let requestBodies: string[];

const createCandidates = (items: Candidate[]) => {
  localStorage.setItem("reviewCandidates", JSON.stringify(items));
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

beforeEach(() => {
  localStorage.clear();
  requestBodies = [];
  fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.body) {
      if (typeof init.body === "string") {
        requestBodies.push(init.body);
      }
    }
    return Promise.resolve(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("ReviewFlashcards", () => {
  it("loads candidates from localStorage and preserves auto versus hybrid sources", async () => {
    createCandidates([
      { id: "card-1", front: "What is AI?", back: "Artificial intelligence." },
      { id: "card-2", front: "What is SSR?", back: "Server-side rendering." },
    ]);

    render(<ReviewFlashcards initialCandidates={[]} />);

    expect(await screen.findByText("Flashcard Review")).toBeInTheDocument();
    expect(screen.getByText("Card 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const firstCall = JSON.parse(requestBodies[0]) as {
      cards: { front: string; back: string; source: "auto" | "manual" | "hybrid" }[];
    };
    expect(firstCall).toEqual({
      cards: [{ front: "What is AI?", back: "Artificial intelligence.", source: "auto" }],
    });

    await waitFor(() => expect(screen.getByText("Card 2 of 2")).toBeInTheDocument());

    const frontInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(frontInput, { target: { value: "What is SSR in Astro?" } });
    fireEvent.click(screen.getByRole("button", { name: /accept/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = JSON.parse(requestBodies[1]) as {
      cards: { front: string; back: string; source: "auto" | "manual" | "hybrid" }[];
    };
    expect(secondCall).toEqual({
      cards: [{ front: "What is SSR in Astro?", back: "Server-side rendering.", source: "hybrid" }],
    });
  });

  it("rejects a card without saving and advances to the next candidate", async () => {
    createCandidates([
      { id: "card-1", front: "Front 1", back: "Back 1" },
      { id: "card-2", front: "Front 2", back: "Back 2" },
    ]);

    render(<ReviewFlashcards initialCandidates={[]} />);

    expect(await screen.findByText("Card 1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Card 2 of 2")).toBeInTheDocument());
  });

  it("shows retry on save failure and completes after a successful retry", async () => {
    fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "boom" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    createCandidates([{ id: "card-1", front: "What is AI?", back: "Artificial intelligence." }]);

    render(<ReviewFlashcards initialCandidates={[]} />);

    fireEvent.click(await screen.findByRole("button", { name: /accept/i }));

    expect(await screen.findByText(/failed to save card/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText(/review complete/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
