import React, { useState } from "react";
import { Sparkles, PenLine } from "lucide-react";

export default function GenerateFlashcards() {
  const [inputText, setInputText] = useState("");
  const [candidates] = useState<{ id: string; front: string; back: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type NavigateFn = (url: string) => void;
  const navigate: NavigateFn =
    typeof window !== "undefined"
      ? ((window as Window & { navigate?: NavigateFn }).navigate ??
        ((url: string) => {
          window.location.assign(url);
        }))
      : (_url: string) => {
          void 0;
        };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = (await res.json()) as {
        flashcards?: { front: string; back: string }[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Unknown error");
      }
      const generated = (data.flashcards ?? []).map((c) => ({
        id: crypto.randomUUID(),
        front: c.front,
        back: c.back,
      }));
      try {
        localStorage.setItem("reviewCandidates", JSON.stringify(generated));
      } catch (storageErr: unknown) {
        if (
          typeof DOMException !== "undefined" &&
          storageErr instanceof DOMException &&
          storageErr.name === "QuotaExceededError"
        ) {
          setError("Storage limit reached. Please clear some space in your browser and try again.");
        } else {
          setError("Could not save flashcards to your browser. Please check your storage settings.");
        }
        setGenerating(false);
        return;
      }
      setTimeout(() => {
        navigate("/review");
      }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate flashcards");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="px-4 py-8">
      <h2 className="mb-4 text-xl font-bold">Flashcard Generator</h2>
      <textarea
        className="mb-2 block w-full rounded border px-2 py-1"
        rows={4}
        placeholder="Paste text to generate flashcards... (minimum 50 characters)"
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
        }}
        disabled={generating}
      />
      <div className="mb-6 flex gap-2">
        <button
          className={`inline-flex items-center gap-2 rounded px-4 py-2 text-white transition ${
            generating || inputText.trim().length < 50
              ? "cursor-not-allowed bg-blue-300"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          onClick={handleGenerate}
          disabled={generating || inputText.trim().length < 50}
        >
          <Sparkles className="size-4" />
          {generating ? "Generating..." : "Generate with AI"}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700"
          onClick={() => {
            navigate("/manual-create");
          }}
          type="button"
        >
          <PenLine className="size-4" />
          Create manually
        </button>
      </div>
      {error && <div className="mb-4 text-red-500">{error}</div>}
      <ul className="space-y-4">
        {candidates.map((card) => (
          <li key={card.id} className="rounded border bg-white p-4 text-gray-900">
            <div className="font-semibold">Front:</div>
            <div className="mb-2">{card.front}</div>
            <div className="font-semibold">Back:</div>
            <div>{card.back}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
