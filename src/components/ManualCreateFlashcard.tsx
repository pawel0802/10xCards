import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  onSuccess?: () => void;
}

export default function ManualCreateFlashcard({ onSuccess }: Props) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValid = front.trim().length > 0 && front.length <= 300 && back.trim().length > 0 && back.length <= 300;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!isValid) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/save-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: [{ front, back, source: "manual" }] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unknown error");
      }
      setSuccess(true);
      setFront("");
      setBack("");
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save card");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block font-semibold mb-1">Front (max 300 chars)</label>
        <textarea
          className={cn("block w-full rounded border px-2 py-1", front.length > 300 && "border-red-500")}
          value={front}
          onChange={e => setFront(e.target.value)}
          maxLength={300}
          rows={3}
          required
        />
        <div className="text-xs text-gray-500">{front.length}/300</div>
      </div>
      <div>
        <label className="block font-semibold mb-1">Back (max 300 chars)</label>
        <textarea
          className={cn("block w-full rounded border px-2 py-1", back.length > 300 && "border-red-500")}
          value={back}
          onChange={e => setBack(e.target.value)}
          maxLength={300}
          rows={3}
          required
        />
        <div className="text-xs text-gray-500">{back.length}/300</div>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">Card created!</div>}
      <button
        type="submit"
        className={cn(
          "rounded bg-green-600 px-4 py-2 text-white transition hover:bg-green-700",
          (!isValid || submitting) && "bg-green-300 cursor-not-allowed"
        )}
        disabled={!isValid || submitting}
      >
        {submitting ? "Saving..." : "Create card"}
      </button>
    </form>
  );
}
