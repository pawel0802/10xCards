import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, RotateCcw, Home, CheckCircle2 } from "lucide-react";

interface DueFlashcard {
  id: string;
  front: string;
  back: string;
}

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

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.debug("SpacedReview: loadCards start");
      const url = `/api/learning/due?limit=${batchSize}`;
      console.debug("SpacedReview: fetching", url);
      const res = await fetch(url);
      console.debug("SpacedReview: fetch status", res.status);
      if (!res.ok) {
        let errorMsg = `Failed to load (${res.status})`;
        try {
          const errJson: unknown = await res.json();
          if (typeof errJson === "object" && errJson !== null) {
            const obj = errJson as Record<string, unknown>;
            if (typeof obj.error === "string") errorMsg = obj.error;
            else if (typeof obj.message === "string") errorMsg = obj.message;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const raw: unknown = await res.json();
      const loaded: DueFlashcard[] = (() => {
        const isDueFlashcard = (x: unknown): x is DueFlashcard => {
          if (typeof x !== "object" || x === null) return false;
          const obj = x as Record<string, unknown>;
          return typeof obj.id === "string" && typeof obj.front === "string" && typeof obj.back === "string";
        };

        const isDueFlashcardArray = (x: unknown): x is DueFlashcard[] => Array.isArray(x) && x.every(isDueFlashcard);

        if (isDueFlashcardArray(raw)) return raw;
        if (typeof raw === "object" && raw !== null) {
          const obj = raw as Record<string, unknown>;
          const maybeCards = obj.cards;
          if (isDueFlashcardArray(maybeCards)) return maybeCards;
        }
        return [];
      })();

      console.debug("SpacedReview: loaded count", loaded.length);
      setCards(loaded);
      setCurrentIdx(0);
    } catch (err: unknown) {
      console.error("SpacedReview: load error", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [batchSize]);

  useEffect(() => {
    if (initialCards.length === 0) {
      void (async () => {
        await loadCards();
      })();
    }
  }, [initialCards.length, loadCards]);

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
        let errorMsg = `Failed to submit (${res.status})`;
        try {
          const errJson: unknown = await res.json();
          if (typeof errJson === "object" && errJson !== null) {
            const obj = errJson as Record<string, unknown>;
            if (typeof obj.error === "string") errorMsg = obj.error;
            else if (typeof obj.message === "string") errorMsg = obj.message;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }
      // success: advance
      setShowBack(false);
      setLastRatingAttempt(null);
      setCurrentIdx((i) => i + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
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
              void loadCards();
            }}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-white"
          >
            <RotateCcw className="size-4" />
            Retry
          </button>
        </div>
      </div>
    );

  if (cards.length === 0)
    return <div className="text-center text-lg font-semibold text-white/80">All caught up! 🎉</div>;

  if (currentIdx >= cards.length)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900/95 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-purple-500/20">
            <CheckCircle2 className="size-8 text-purple-400" />
          </div>
          <h2 className="mb-1 text-xl font-bold text-white">Review Complete!</h2>
          <p className="mb-6 text-sm text-white/60">All cards processed.</p>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            onClick={() => {
              if (typeof window !== "undefined") window.location.assign("/dashboard");
            }}
            type="button"
          >
            <Home className="size-4" />
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
        <div className="text-sm font-medium text-white">
          Card {currentIdx + 1} of {total}
        </div>
        <div className="h-2 flex-1 rounded bg-gray-200">
          <div className="h-2 rounded bg-purple-500" style={{ width: `${((currentIdx + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div className="mb-4 rounded border bg-white/5 p-4">
        <div className="mb-2 text-lg font-semibold text-white">{card.front}</div>
        {showBack && <div className="mb-2 text-base text-white/90">{card.back}</div>}
        {!showBack && (
          <button
            className="mt-2 inline-flex items-center gap-2 rounded bg-white/10 px-3 py-1 text-sm text-white"
            onClick={() => {
              setShowBack(true);
            }}
          >
            <Eye className="size-4" />
            Show answer
          </button>
        )}
      </div>

      {error && cards.length > 0 && (
        <div className="mb-2 text-red-500">
          <div>{error}</div>
          {lastRatingAttempt !== null && (
            <div className="mt-2">
              <button
                onClick={() => {
                  setError(null);
                  void submitRating(lastRatingAttempt);
                }}
                className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-white"
              >
                <RotateCcw className="size-4" />
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
            onClick={() => void submitRating(r.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded px-4 py-2 text-white",
              r.className,
              submitting && "cursor-not-allowed opacity-50",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
