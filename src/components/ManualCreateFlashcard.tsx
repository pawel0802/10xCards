import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Save, ArrowLeft, RotateCcw, Plus, Home } from "lucide-react";

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
        <label className="mb-1 block font-semibold">Front</label>
        <textarea
          className={cn("block w-full rounded border px-2 py-1", front.length > 300 && "border-red-500")}
          value={front}
          onChange={(e) => {
            setFront(e.target.value);
          }}
          maxLength={300}
          rows={3}
          required
          placeholder="Enter front text (min 1, max 300 characters)"
        />
        <div className="text-xs text-gray-500">{front.length}/300</div>
      </div>
      <div>
        <label className="mb-1 block font-semibold">Back</label>
        <textarea
          className={cn("block w-full rounded border px-2 py-1", back.length > 300 && "border-red-500")}
          value={back}
          onChange={(e) => {
            setBack(e.target.value);
          }}
          maxLength={300}
          rows={3}
          required
          placeholder="Enter back text (min 1, max 300 characters)"
        />
        <div className="text-xs text-gray-500">{back.length}/300</div>
      </div>
      {/* Modal for success or error */}
      {(success || error) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-full max-w-xs rounded-2xl border border-gray-200/80 bg-gray-200 p-6 text-center text-gray-900 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold">{success ? "Card created!" : "Failed to create card"}</h3>
            {error && <div className="mb-4 text-red-600">{error}</div>}
            <div className="mt-4 flex flex-col gap-2">
              {error && (
                <button
                  className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                  onClick={async () => {
                    await handleSubmit({ preventDefault: () => {} } as any);
                  }}
                  type="button"
                >
                  <RotateCcw className="size-4" />
                  Retry
                </button>
              )}
              <button
                className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                onClick={() => {
                  setSuccess(false);
                  setError(null);
                  setFront("");
                  setBack("");
                }}
                type="button"
              >
                <Plus className="size-4" />
                Create another one
              </button>
              <button
                className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.href = "/dashboard";
                }}
                type="button"
              >
                <Home className="size-4" />
                Finish
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className={cn(
            "inline-flex items-center gap-2 rounded px-4 py-2 text-white transition",
            !isValid || submitting ? "cursor-not-allowed bg-purple-300" : "bg-purple-600 hover:bg-purple-700",
          )}
          disabled={!isValid || submitting}
        >
          <Save className="size-4" />
          {submitting ? "Saving..." : "Create card"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          onClick={() => {
            if (typeof window !== "undefined") window.location.href = "/generate";
          }}
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>
    </form>
  );
}
