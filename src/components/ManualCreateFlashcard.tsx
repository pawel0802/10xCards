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
                  placeholder="Enter front text (min 1, max 300 characters)"
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
                  placeholder="Enter back text (min 1, max 300 characters)"
                />
                <div className="text-xs text-gray-500">{back.length}/300</div>
      </div>
      {/* Modal for success or error */}
            {(success || error) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-6 text-center text-white backdrop-blur-xl w-full max-w-xs shadow-xl">
                  <h3 className="text-lg font-bold mb-2">
                    {success ? "Card created!" : "Failed to create card"}
                  </h3>
                  {error && <div className="mb-4 text-red-600">{error}</div>}
                  <div className="flex flex-col gap-2 mt-4">
                    {error && (
                      <button
                        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                        onClick={() => handleSubmit(new Event('submit') as any)}
                        type="button"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                      onClick={() => {
                        setSuccess(false); setError(null); setFront(""); setBack("");
                      }}
                      type="button"
                    >
                      Create another one
                    </button>
                    <button
                      className="rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
                      onClick={() => {
                        if (typeof window !== "undefined") window.location.href = "/dashboard";
                      }}
                      type="button"
                    >
                      Finish
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button
              type="submit"
              className={cn(
                "rounded px-4 py-2 text-white transition",
                (!isValid || submitting)
                  ? "bg-green-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              )}
              disabled={!isValid || submitting}
            >
              {submitting ? "Saving..." : "Create card"}
            </button>
    </form>
  );
}
