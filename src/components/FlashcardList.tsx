import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Flashcard } from "@/types";
import EditFlashcardModal from "@/components/EditFlashcardModal";
import { Toast } from "@/components/ui/Toast";

interface FlashcardListProps {
  className?: string;
}

interface ApiResponse {
  data: Flashcard[];
  count: number;
  error?: string;
}

export const FlashcardList: React.FC<FlashcardListProps> = ({ className }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [editModal, setEditModal] = useState<{open: boolean, card: Flashcard|null}>({open: false, card: null});
  const [toast, setToast] = useState<{message: string, type?: "success"|"error"} | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/flashcards?page=${page}`)
      .then((res) => res.json())
      .then((res: ApiResponse) => {
        if (res.error) setError(res.error);
        else {
          setFlashcards(res.data);
          setCount(res.count);
          setError(null);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <div className={cn("p-4", className)}>Loading...</div>;
  if (error) return <div className={cn("p-4 text-red-500", className)}>{error}</div>;

  // --- Handlers ---
function handleDelete(id: string) {
  if (!window.confirm("Delete this flashcard? This cannot be undone.")) return;
  fetch(`/api/flashcards`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [id] }),
  })
    .then(res => res.json())
    .then(res => {
      if (res.error) setToast({message: res.error, type: "error"});
      else {
        setFlashcards(cards => cards.filter(c => c.id !== id));
        setToast({message: "Flashcard deleted!", type: "success"});
      }
    });
}
function handleMassDelete() {
  if (selected.length === 0) return;
  if (!window.confirm(`Delete ${selected.length} flashcards? This cannot be undone.`)) return;
  fetch(`/api/flashcards`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: selected }),
  })
    .then(res => res.json())
    .then(res => {
      if (res.error) setToast({message: res.error, type: "error"});
      else {
        setFlashcards(cards => cards.filter(c => !selected.includes(c.id)));
        setToast({message: "Flashcards deleted!", type: "success"});
        setSelected([]);
      }
    });
}

if (flashcards.length === 0) {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className={cn("flex flex-col items-center gap-4 p-8", className)}>
          <div className="text-lg">You don't have any flashcards yet</div>
          <div className="flex gap-2">
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2"><a href="/generate">Generate flashcards</a></Button>
            <Button asChild className="bg-[#7f1d1d] hover:bg-[#581313] text-white rounded px-4 py-2"><a href="/dashboard">Back</a></Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={cn("w-full", className)}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {editModal.open && editModal.card && (
          <EditFlashcardModal
            open={editModal.open}
            flashcard={editModal.card}
            onClose={() => setEditModal({open: false, card: null})}
            onSave={updated => {
              setFlashcards(cards => cards.map(c => c.id === updated.id ? updated : c));
              setToast({message: "Flashcard updated!", type: "success"});
            }}
          />
        )}
        <table className="min-w-full rounded-xl shadow-lg overflow-hidden">
          <thead>
          <tr className="bg-gradient-to-r from-blue-700/80 to-purple-700/80 border-b-4 border-blue-400/60 sticky top-0 z-10">
            <th className="px-4 py-4"></th>
            <th className="px-6 py-4 text-center font-extrabold text-xl text-white drop-shadow">Front</th>
            <th className="px-6 py-4 text-center font-extrabold text-xl text-white drop-shadow">Back</th>
            <th className="px-4 py-4"></th>
          </tr>
          </thead>
          <tbody>
            {flashcards.map((card, idx) => (
              <tr
                key={card.id}
                onClick={() => setSelected(sel => sel.includes(card.id) ? sel.filter(id => id !== card.id) : [...sel, card.id])}
                className={cn(
                  idx % 2 === 0
                    ? "bg-white/20 hover:bg-white/30 transition"
                    : "bg-white/10 hover:bg-white/30 transition",
                  selected.includes(card.id) && "!bg-blue-500/40 ring-2 ring-blue-700/60"
                )}
              >
                <td className="px-6 py-4 text-center text-white">{card.front}</td>
                <td className="px-6 py-4 text-center text-white">{card.back}</td>
                <td className="px-4 py-4 text-center">
                  <Button size="sm" onClick={() => setEditModal({open: true, card})}>Edit</Button>
                  <Button size="sm" className="ml-2 bg-red-600 hover:bg-red-700" onClick={() => handleDelete(card.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center mt-4">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
    Previous
  </Button>
          <span>
            Page {page} of {Math.max(1, Math.ceil(count / 10))}
          </span>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2" onClick={() => setPage((p) => (p * 10 < count ? p + 1 : p))} disabled={page * 10 >= count}>
    Next
  </Button>
        </div>
        <div className="flex gap-2 mt-6">
          <Button className="bg-red-700 hover:bg-red-800" disabled={selected.length === 0} onClick={handleMassDelete}>Delete Selected</Button>
          <Button asChild className="bg-[#7f1d1d] hover:bg-[#581313] text-white rounded px-4 py-2">
            <a href="/dashboard">Back</a>
          </Button>
        </div>
      </div>
    );
};

export default FlashcardList;
