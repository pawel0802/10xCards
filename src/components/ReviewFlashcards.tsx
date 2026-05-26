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
  const [candidates, setCandidates] = useState(initialCandidates);
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
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const handleAccept = (id: string) => {
    setCandidates(candidates.map((c) => (c.id === id ? { ...c, status: "accepted" } : c)));
    setHasChanges(true);
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

  const [inputText, setInputText] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unknown error");
      }
      const data = await res.json();
      setCandidates(
        (data.flashcards as { front: string; back: string }[]).map((c, i) => ({
          id: String(Date.now()) + "-" + i,
          front: c.front,
          back: c.back,
        })),
      );
      setHasChanges(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate flashcards");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">AI Flashcard Generator</h2>
      <textarea
        className="mb-2 block w-full rounded border px-2 py-1"
        rows={4}
        placeholder="Paste text to generate flashcards..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        disabled={generating}
      />
      <button className="btn mb-6" onClick={handleGenerate} disabled={generating || !inputText.trim()}>
        {generating ? "Generating..." : "Generate flashcards"}
      </button>
      <ul className="space-y-4">
        {candidates.map((card) => (
          <li key={card.id} className={cn("rounded border p-4", card.status === "rejected" && "opacity-50")}>
            <input
              className="mb-2 block w-full rounded border px-2 py-1"
              value={card.front}
              onChange={(e) => handleEdit(card.id, e.target.value, card.back)}
              disabled={card.status === "rejected"}
            />
            <input
              className="mb-2 block w-full rounded border px-2 py-1"
              value={card.back}
              onChange={(e) => handleEdit(card.id, card.front, e.target.value)}
              disabled={card.status === "rejected"}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className={cn("btn", card.status === "accepted" && "bg-green-200")}
                onClick={() => handleAccept(card.id)}
                disabled={card.status === "accepted"}
              >
                Accept
              </button>
              <button
                type="button"
                className={cn("btn", card.status === "rejected" && "bg-red-200")}
                onClick={() => handleReject(card.id)}
                disabled={card.status === "rejected"}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button className="btn mt-6" onClick={handleSubmit} disabled={loading || !hasChanges}>
        Save accepted flashcards
      </button>
    </div>
  );
}
