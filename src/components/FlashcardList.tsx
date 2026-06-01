import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, ChevronLeft, ChevronRight, Sparkles, AlertTriangle } from "lucide-react";
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
  const [editModal, setEditModal] = useState<{ open: boolean; card: Flashcard | null }>({ open: false, card: null });
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [showMassDeleteModal, setShowMassDeleteModal] = useState(false);

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
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page]);

  if (loading) return <div className={cn("p-4", className)}>Loading...</div>;
  if (error) return <div className={cn("p-4 text-red-500", className)}>{error}</div>;

  // --- Handlers ---
  function handleDelete(id: string) {
    fetch(`/api/flashcards`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.error) setToast({ message: res.error, type: "error" });
        else {
          setFlashcards((cards) => cards.filter((c) => c.id !== id));
          setToast({ message: "Flashcard deleted!", type: "success" });
        }
      });
  }
  function handleMassDelete() {
    if (selected.length === 0) return;
    setShowMassDeleteModal(true);
  }

  function confirmMassDelete() {
    fetch(`/api/flashcards`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.error) setToast({ message: res.error, type: "error" });
        else {
          setFlashcards((cards) => cards.filter((c) => !selected.includes(c.id)));
          setToast({ message: "Flashcards deleted!", type: "success" });
          setSelected([]);
        }
      });
    setShowMassDeleteModal(false);
  }

  if (flashcards.length === 0) {
    return (
      <>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => {
              setToast(null);
            }}
          />
        )}
        <div className={cn("flex flex-col items-center gap-4 p-8", className)}>
          <div className="text-lg">You don't have any flashcards yet</div>
          <div className="flex gap-2">
            <Button
              asChild
              className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              <a href="/generate">
                <Sparkles className="size-4" />
                Generate flashcards
              </a>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => {
            setToast(null);
          }}
        />
      )}
      {editModal.open && editModal.card && (
        <EditFlashcardModal
          open={editModal.open}
          flashcard={editModal.card}
          onClose={() => {
            setEditModal({ open: false, card: null });
          }}
          onSave={(updated) => {
            setFlashcards((cards) => cards.map((c) => (c.id === updated.id ? updated : c)));
            setToast({ message: "Flashcard updated!", type: "success" });
          }}
        />
      )}
      <table className="min-w-full overflow-hidden rounded-xl shadow-lg">
        <thead>
          <tr className="sticky top-0 z-10 border-b-4 border-blue-400/60 bg-gradient-to-r from-blue-700/80 to-purple-700/80">
            <th className="px-6 py-4 text-center text-xl font-extrabold text-white drop-shadow">Front</th>
            <th className="px-6 py-4 text-center text-xl font-extrabold text-white drop-shadow">Back</th>
            <th className="px-4 py-4"></th>
          </tr>
        </thead>
        <tbody>
          {flashcards.map((card, idx) => (
            <tr
              key={card.id}
              onClick={() => {
                setSelected((sel) => (sel.includes(card.id) ? sel.filter((id) => id !== card.id) : [...sel, card.id]));
              }}
              className={cn(
                idx % 2 === 0 ? "bg-white/20 transition hover:bg-white/30" : "bg-white/10 transition hover:bg-white/30",
                selected.includes(card.id) && "!bg-blue-500/40 ring-2 ring-blue-700/60",
              )}
            >
              <td className="px-6 py-4 text-center text-white">{card.front}</td>
              <td className="px-6 py-4 text-center text-white">{card.back}</td>
              <td className="px-4 py-4 text-center">
                {selected.includes(card.id) && (
                  <>
                    <Button
                      size="sm"
                      className="inline-flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditModal({ open: true, card });
                      }}
                    >
                      <Pencil className="size-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      className="ml-2 inline-flex items-center gap-1 bg-red-600 hover:bg-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(card.id);
                      }}
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center justify-between">
        {page > 1 && (
          <Button
            className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
            }}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
        )}
        <span>
          Page {page} of {Math.max(1, Math.ceil(count / 10))}
        </span>
        {page * 10 < count && (
          <Button
            className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            onClick={() => {
              setPage((p) => p + 1);
            }}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
      <div className="mt-6 flex gap-2">
        {selected.length >= 2 && (
          <Button className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-800" onClick={handleMassDelete}>
            <Trash2 className="size-4" />
            Delete Selected
          </Button>
        )}
      </div>

      {showMassDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900/95 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-500/20">
              <AlertTriangle className="size-8 text-red-400" />
            </div>
            <h3 className="mb-1 text-xl font-bold text-white">Delete {selected.length} flashcards?</h3>
            <p className="mb-6 text-sm text-white/60">
              This action cannot be undone. Are you sure you want to delete the selected flashcards?
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
                onClick={() => { setShowMassDeleteModal(false); }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                onClick={confirmMassDelete}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardList;
