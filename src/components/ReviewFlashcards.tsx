import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface FlashcardCandidate {
  id: string;
  front: string;
  back: string;
  status?: "accepted" | "rejected" | "edited";
}

interface ReviewFlashcardsProps {
  initialCandidates: FlashcardCandidate[];
}

export default function ReviewFlashcards({ initialCandidates }: ReviewFlashcardsProps) {
  const [candidates, setCandidates] = useState<FlashcardCandidate[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("reviewCandidates");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return initialCandidates;
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Navigation warning
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [hasChanges]);

  // Accept and save immediately
  const handleAccept = async (id: string) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: "accepted" } : c)));
    setHasChanges(true);
    setLoading(true);
    setError(null);
    const card = candidates.find((c) => c.id === id);
    if (!card) return;
    try {
      const res = await fetch("/api/save-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: [{ front: card.front, back: card.back }] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unknown error");
      }
      setHasChanges(false);
    } catch (e) {
      setError("Failed to save card. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleReject = (id: string) => {
    setCandidates(candidates.map((c) => (c.id === id ? { ...c, status: "rejected" } : c)));
    setHasChanges(true);
  };
  const handleEdit = (id: string, front: string, back: string) => {
    setCandidates(candidates.map((c) => (c.id === id ? { ...c, front, back, status: "edited" } : c)));
    setHasChanges(true);
  };

  // Save accepted/edited cards to backend
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const toSave = candidates.filter((c) => c.status === "accepted" || c.status === "edited");
      const res = await fetch("/api/save-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: toSave.map(({ front, back }) => ({ front, back })) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unknown error");
      }
      setHasChanges(false);
    } catch (e) {
      setError("Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center">
        <span>Saving...</span>
      </div>
    );
  if (error)
    return (
      <div className="text-red-500">
        {error} <button onClick={handleSubmit}>Retry</button>
      </div>
    );

  // Removed AI generation UI for review-only mode

  return (
    <div className="px-4 py-8">
      <h2 className="mb-4 text-xl font-bold">Flashcard Review</h2>
      {candidates.length > 0 && currentIdx < candidates.length && (
        <div className="mb-4 flex items-center gap-4">
          <div className="text-sm text-gray-700">
            Card {currentIdx + 1} of {candidates.length}
          </div>
          <div className="flex-1 h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-blue-500 rounded"
              style={{ width: `${((currentIdx + 1) / candidates.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      {candidates.length === 0 ? (
        <div>No flashcards to review.</div>
      ) : currentIdx >= candidates.length ? (
        <div>Review complete! All cards processed.</div>
      ) : (
        <div className="rounded border p-4">
          <input
            className="mb-2 block w-full rounded border px-2 py-1"
            value={
              candidates[currentIdx].front.length > 150
                ? candidates[currentIdx].front.slice(0, 150) + "..."
                : candidates[currentIdx].front
            }
            onChange={(e) => {
              handleEdit(candidates[currentIdx].id, e.target.value, candidates[currentIdx].back);
            }}
            disabled={candidates[currentIdx].status === "rejected"}
            maxLength={150}
          />
          <input
            className="mb-2 block w-full rounded border px-2 py-1"
            value={
              candidates[currentIdx].back.length > 150
                ? candidates[currentIdx].back.slice(0, 150) + "..."
                : candidates[currentIdx].back
            }
            onChange={(e) => {
              handleEdit(candidates[currentIdx].id, candidates[currentIdx].front, e.target.value);
            }}
            disabled={candidates[currentIdx].status === "rejected"}
            maxLength={150}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(
                "rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700",
                candidates[currentIdx].status === "accepted" && "bg-green-600",
              )}
              onClick={async () => {
                await handleAccept(candidates[currentIdx].id);
                setCurrentIdx((idx) => idx + 1);
              }}
              disabled={loading || candidates[currentIdx].status === "accepted"}
            >
              Accept
            </button>
            <button
              type="button"
              className={cn(
                "rounded bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300",
                candidates[currentIdx].status === "rejected" && "bg-red-600 text-white",
              )}
              onClick={() => {
                handleReject(candidates[currentIdx].id);
                setCurrentIdx((idx) => idx + 1);
              }}
              disabled={candidates[currentIdx].status === "rejected"}
            >
              Reject
            </button>
          </div>
        </div>
      )}
      {currentIdx >= candidates.length && (
        <button
          className="mt-6 rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          onClick={() => {
            // TODO: Replace with real dashboard navigation
            if (typeof window !== "undefined") {
              window.location.href = "/dashboard";
            }
          }}
        >
          Show your flashcards
        </button>
      )}
    </div>
  );
}
