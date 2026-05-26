import React, { useState } from "react";

export default function GenerateFlashcards() {
  const [inputText, setInputText] = useState("");
  const [candidates] = useState<{ id: string; front: string; back: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate =
    typeof window !== "undefined"
      ? (window as any).navigate ||
        ((url: string) => {
          window.location.href = url;
        })
      : () => {};

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
      const generated = (data.flashcards as { front: string; back: string }[]).map((c, i) => ({
        id: String(Date.now()) + "-" + i,
        front: c.front,
        back: c.back,
      }));
      try {
        localStorage.setItem("reviewCandidates", JSON.stringify(generated));
      } catch {}
      setTimeout(() => navigate("/review"), 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate flashcards");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="px-4 py-8">
      <h2 className="mb-4 text-xl font-bold">AI Flashcard Generator</h2>
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
      <div className="mb-2 text-sm text-gray-600">
        Minimum input length: 50 characters. Please paste at least 50 characters of text to enable flashcard generation.
      </div>
      <button
        className={`mb-6 rounded px-4 py-2 text-white transition ${
          generating || inputText.trim().length < 50 ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
        } `}
        onClick={handleGenerate}
        disabled={generating || inputText.trim().length < 50}
      >
        {generating ? "Generating..." : "Generate flashcards"}
      </button>
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
