import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import SpacedReview from "./SpacedReview";

afterEach(cleanup);

describe("SpacedReview", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders initial card and advances on successful review", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    render(<SpacedReview initialCards={[{ id: "c1", front: "Q1", back: "A1" }]} />);
    expect(screen.getByText("Card 1 of 1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Show answer"));
    expect(screen.getByText("A1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Good"));
    await waitFor(() => expect(screen.getByText("Review Complete!")).toBeInTheDocument());
  });

  it("shows error on failed submit and allows retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "Server" }),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }),
    );

    render(<SpacedReview initialCards={[{ id: "c2", front: "Q2", back: "A2" }]} />);
    fireEvent.click(screen.getByText("Show answer"));
    fireEvent.click(screen.getByText("Again"));
    await waitFor(() => expect(screen.getByText("Server")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Retry"));
    await waitFor(() => expect(screen.getByText("Review Complete!")).toBeInTheDocument());
  });

  it("shows scheduler-friendly message and reports to clipboard", async () => {
    // First submit fails with scheduler-specific error, then retry succeeds
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Scheduler computation failed: invalid memory" }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    // Stub navigator.clipboard
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<SpacedReview initialCards={[{ id: "c3", front: "Q3", back: "A3" }]} />);
    fireEvent.click(screen.getByText("Show answer"));
    fireEvent.click(screen.getByText("Again"));

    await waitFor(() => expect(screen.getByText(/Internal scheduling error prevented/)).toBeInTheDocument());

    // Report button should exist
    const reportBtn = screen.getByText("Report");
    expect(reportBtn).toBeInTheDocument();

    // Click report -> should copy payload
    fireEvent.click(reportBtn);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });

    // Copied confirmation shown
    await waitFor(() => expect(screen.getByText(/Copied details to clipboard/)).toBeInTheDocument());

    // Retry should succeed and finish review
    fireEvent.click(screen.getByText("Retry"));
    await waitFor(() => expect(screen.getByText("Review Complete!")).toBeInTheDocument());
  });
});
