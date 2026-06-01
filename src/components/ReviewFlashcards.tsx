import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, RotateCcw, Home } from "lucide-react";

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
  const [storageError, setStorageError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<FlashcardCandidate[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("reviewCandidates");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          setStorageError("Could not load flashcards from your browser. Data may be corrupted.");
        }
      }
    }
    return initialCandidates;
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Navigation warning (only during active review)
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges && currentIdx < candidates.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [hasChanges, currentIdx, candidates.length]);

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
        body: JSON.stringify({
          cards: [{ front: card.front, back: card.back, source: card.status === "edited" ? "hybrid" : "auto" }],
        }),
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
        body: JSON.stringify({
          cards: toSave.map(({ front, back, status }) => ({
            front,
            back,
            source: status === "edited" ? "hybrid" : "auto",
          })),
        }),
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
        {error}{" "}
        <button className="inline-flex items-center gap-2" onClick={handleSubmit}>
          <RotateCcw className="size-4" />
          Retry
        </button>
      </div>
    );

  // Removed AI generation UI for review-only mode

  return (
    <div className="px-4 py-8">
      {storageError && <div className="mb-4 text-red-500">{storageError}</div>}
      <h2 className="mb-4 text-xl font-bold">Flashcard Review</h2>
      {candidates.length > 0 && currentIdx < candidates.length && (
        <div className="mb-4 flex items-center gap-4">
          <div className="text-sm text-gray-700">
            Card {currentIdx + 1} of {candidates.length}
          </div>
          <div className="h-2 flex-1 rounded bg-gray-200">
            <div
              className="h-2 rounded bg-purple-500"
              style={{ width: `${((currentIdx + 1) / candidates.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      {candidates.length === 0 ? (
        <div>No flashcards to review.</div>
      ) : currentIdx >= candidates.length ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-full max-w-xs rounded-2xl border border-gray-200/80 bg-gray-200 p-6 text-center text-gray-900 shadow-2xl">
            <h2 className="mb-2 text-xl font-bold">Review Complete!</h2>
            <div className="mb-4">All cards processed.</div>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/dashboard";
                }
              }}
              type="button"
            >
              <Home className="size-4" />
              Finish
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded border p-4">
          <textarea
            className="mb-2 block min-h-[60px] w-full resize-y rounded border px-2 py-1"
            value={candidates[currentIdx].front}
            onChange={(e) => {
              handleEdit(candidates[currentIdx].id, e.target.value, candidates[currentIdx].back);
            }}
            disabled={candidates[currentIdx].status === "rejected"}
            rows={Math.max(2, Math.ceil(candidates[currentIdx].front.length / 60))}
            style={{ minHeight: "60px" }}
          />
          <textarea
            className="mb-2 block min-h-[60px] w-full resize-y rounded border px-2 py-1"
            value={candidates[currentIdx].back}
            onChange={(e) => {
              handleEdit(candidates[currentIdx].id, candidates[currentIdx].front, e.target.value);
            }}
            disabled={candidates[currentIdx].status === "rejected"}
            rows={Math.max(2, Math.ceil(candidates[currentIdx].back.length / 60))}
            style={{ minHeight: "60px" }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700",
                candidates[currentIdx].status === "accepted" && "bg-green-600",
              )}
              onClick={async () => {
                await handleAccept(candidates[currentIdx].id);
                setCurrentIdx((idx) => idx + 1);
              }}
              disabled={loading || candidates[currentIdx].status === "accepted"}
            >
              <CheckCircle className="size-4" />
              Accept
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded bg-[#7f1d1d] px-4 py-2 text-white transition hover:bg-[#581313]",
                candidates[currentIdx].status === "rejected" && "bg-[#3b0a0a]",
              )}
              onClick={() => {
                handleReject(candidates[currentIdx].id);
                setCurrentIdx((idx) => idx + 1);
              }}
              disabled={candidates[currentIdx].status === "rejected"}
            >
              <XCircle className="size-4" />
              Reject
            </button>
          </div>
        </div>
      )}
      {currentIdx >= candidates.length && (
        <button
          className="mt-6 inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/dashboard";
            }
          }}
        >
          <Home className="size-4" />
          Finish
        </button>
      )}
    </div>
  );
}
