import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/types";
import { Button } from "@/components/ui/button";

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
        body: JSON.stringify({ id: flashcard.id, front, back }),
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
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50")}> 
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Flashcard</h2>
        <div className="mb-4">
          <label htmlFor="edit-front" className="block font-semibold mb-1">Front</label>
                    <input id="edit-front" className="w-full border rounded px-2 py-1" value={front} onChange={e => setFront(e.target.value)} />
        </div>
        <div className="mb-4">
          <label htmlFor="edit-back" className="block font-semibold mb-1">Back</label>
                    <input id="edit-back" className="w-full border rounded px-2 py-1" value={back} onChange={e => setBack(e.target.value)} />
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="flex gap-2 justify-end">
          <Button onClick={onClose} disabled={saving} variant="secondary">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || (!front.trim() || !back.trim())}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditFlashcardModal;
