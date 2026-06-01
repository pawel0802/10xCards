import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type DueFlashcard = { id: string; front: string; back: string };

interface SpacedReviewProps {
  initialCards?: DueFlashcard[];
  batchSize?: number;
}

export default function SpacedReview({ initialCards = [], batchSize = 10 }: SpacedReviewProps) {
  const [cards, setCards] = useState<DueFlashcard[]>(initialCards);
  const [loading, setLoading] = useState(initialCards.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [lastRatingAttempt, setLastRatingAttempt] = useState<number | null>(null);

  useEffect(() => {
    if (initialCards.length === 0) {
      loadCards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCards() {
    setLoading(true);
    setError(null);
    try {
        console.debug('SpacedReview: loadCards start');
        const url = `/api/learning/due?limit=${batchSize}`;
        console.debug('SpacedReview: fetching', url);
        const res = await fetch(url);
        console.debug('SpacedReview: fetch status', res.status);
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(data.error || `Failed to load (${res.status})`);
        }
        const data = await res.json();
        const loaded = Array.isArray(data) ? data : data.cards ?? [];
        console.debug('SpacedReview: loaded count', loaded.length);
        setCards(loaded);
        setCurrentIdx(0);
      } catch (e: any) {
        console.error('SpacedReview: load error', e);
        setError(e.message || "Failed to load cards.");
      } finally {
        setLoading(false);
      }
    }

  async function submitRating(rating: number) {
    if (!cards[currentIdx]) return;
    setSubmitting(true);
    setError(null);
    setLastRatingAttempt(rating);
    const card = cards[currentIdx];
    try {
      const res = await fetch("/api/learning/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcardId: card.id, rating }),
      });
      if (res.status === 409) {
        // dedupe; treat as success
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error || `Failed to submit (${res.status})`);
      }
      // success: advance
      setShowBack(false);
      setLastRatingAttempt(null);
      setCurrentIdx((i) => i + 1);
    } catch (e: any) {
      setError(e.message || "Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center">
        <span>Loading...</span>
      </div>
    );

  // Initial load error (fetching cards)
  if (error && cards.length === 0)
    return (
      <div className="text-red-500">
        <div>{error}</div>
        <div className="mt-2">
          <button
            onClick={() => {
              setError(null);
              loadCards();
            }}
            className="rounded bg-blue-600 px-3 py-1 text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );

  if (cards.length === 0)
    return (
      <div className="text-center text-lg font-semibold text-white/80">All caught up! 🎉</div>
    );

  if (currentIdx >= cards.length)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="rounded-2xl border border-gray-200/80 bg-gray-200 p-6 text-center text-gray-900 shadow-2xl w-full max-w-xs">
          <h2 className="text-xl font-bold mb-2">Review Complete!</h2>
          <div className="mb-4">All cards processed.</div>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 mt-4"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/dashboard";
            }}
            type="button"
          >
            Finish
          </button>
        </div>
      </div>
    );

  const card = cards[currentIdx];
  const total = cards.length;

  const ratings = [
    { label: "Again", value: 1, className: "bg-red-600 hover:bg-red-700" },
    { label: "Hard", value: 2, className: "bg-yellow-600 hover:bg-yellow-700" },
    { label: "Good", value: 3, className: "bg-blue-600 hover:bg-blue-700" },
    { label: "Easy", value: 4, className: "bg-green-600 hover:bg-green-700" },
  ];

  return (
    <div className="px-4 py-8">
      <div className="mb-4 flex items-center gap-4">
        <div className="text-sm text-white font-medium">Card {currentIdx + 1} of {total}</div>
        <div className="flex-1 h-2 bg-gray-200 rounded">
          <div className="h-2 bg-blue-500 rounded" style={{ width: `${((currentIdx + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div className="rounded border p-4 mb-4 bg-white/5">
        <div className="mb-2 text-lg font-semibold text-white">{card.front}</div>
        {showBack && <div className="mb-2 text-base text-white/90">{card.back}</div>}
        {!showBack && (
          <button className="mt-2 rounded bg-white/10 px-3 py-1 text-sm text-white" onClick={() => setShowBack(true)}>
            Show answer
          </button>
        )}
      </div>

      {error && cards.length > 0 && (
        <div className="text-red-500 mb-2">
          <div>{error}</div>
          {lastRatingAttempt !== null && (
            <div className="mt-2">
              <button
                onClick={() => {
                  setError(null);
                  submitRating(lastRatingAttempt);
                }}
                className="rounded bg-blue-600 px-3 py-1 text-white"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {ratings.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={submitting}
            onClick={() => submitRating(r.value)}
            className={cn("rounded px-4 py-2 text-white", r.className, submitting && "opacity-50 cursor-not-allowed")}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
