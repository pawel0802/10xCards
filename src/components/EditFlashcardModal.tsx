import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/types";
import { Button } from "@/components/ui/button";
import { Pencil, X } from "lucide-react";

interface EditFlashcardModalProps {
  open: boolean;
  onClose: () => void;
  flashcard: Flashcard;
  onSave: (updated: Flashcard) => void;
}

export const EditFlashcardModal: React.FC<EditFlashcardModalProps> = ({ open, onClose, flashcard, onSave }) => {
  const [front, setFront] = useState(flashcard.front);
  const [back, setBack] = useState(flashcard.back);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/flashcards`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flashcard.id, update: { front, back } }),
      });
      const data = await res.json();
      if (res.ok) {
        onSave({ ...flashcard, front, back, source: flashcard.source === "auto" ? "hybrid" : flashcard.source });
        onClose();
      } else {
        setError(data.error || "Failed to save changes");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm")}>
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gray-900/95 p-6 shadow-2xl">
        <button
          className="absolute right-4 top-4 text-white/40 hover:text-white/80 transition-colors"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-purple-500/20">
            <Pencil className="size-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Edit Flashcard</h2>
        </div>
        <div className="mb-4">
          <label htmlFor="edit-front" className="mb-1 block text-sm font-medium text-white/70">Front</label>
          <input
            id="edit-front"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            value={front}
            onChange={e => setFront(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="edit-back" className="mb-1 block text-sm font-medium text-white/70">Back</label>
          <input
            id="edit-back"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            value={back}
            onChange={e => setBack(e.target.value)}
          />
        </div>
        {error && <div className="mb-4 text-sm text-red-400">{error}</div>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!front.trim() || !back.trim())}
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditFlashcardModal;
