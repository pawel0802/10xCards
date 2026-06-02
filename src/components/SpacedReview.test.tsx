import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import SpacedReview from "./SpacedReview";

afterEach(cleanup);

describe("SpacedReview", () => {
  beforeEach(() => {
    (global as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders initial card and advances on successful review", async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<SpacedReview initialCards={[{ id: "c1", front: "Q1", back: "A1" }]} />);
    expect(screen.getByText("Card 1 of 1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Show answer"));
    expect(screen.getByText("A1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Good"));
    await waitFor(() => expect(screen.getByText("Review Complete!")).toBeInTheDocument());
  });

  it("shows error on failed submit and allows retry", async () => {
    (global as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: "Server" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<SpacedReview initialCards={[{ id: "c2", front: "Q2", back: "A2" }]} />);
    fireEvent.click(screen.getByText("Show answer"));
    fireEvent.click(screen.getByText("Again"));
    await waitFor(() => expect(screen.getByText("Server")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Retry"));
    await waitFor(() => expect(screen.getByText("Review Complete!")).toBeInTheDocument());
  });
});
