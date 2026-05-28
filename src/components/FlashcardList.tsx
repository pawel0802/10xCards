import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Flashcard } from "@/types";

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

  if (flashcards.length === 0) {
    return (
      <div className={cn("flex flex-col items-center gap-4 p-8", className)}>
        <div className="text-lg">You don't have any flashcards yet</div>
        <div className="flex gap-2">
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2"><a href="/generate">Generate flashcards</a></Button>
          <Button asChild className="bg-[#7f1d1d] hover:bg-[#581313] text-white rounded px-4 py-2"><a href="/dashboard">Back</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <table className="min-w-full rounded-xl shadow-lg overflow-hidden">
        <thead>
          <tr className="bg-white/30">
            <th className="px-6 py-3 text-center font-bold text-lg text-white">Front</th>
            <th className="px-6 py-3 text-center font-bold text-lg text-white">Back</th>
          </tr>
        </thead>
        <tbody>
          {flashcards.map((card, idx) => (
            <tr
              key={card.id}
              className={
                idx % 2 === 0
                  ? "bg-white/20 hover:bg-white/30 transition"
                  : "bg-white/10 hover:bg-white/30 transition"
              }
            >
              <td className="px-6 py-4 text-center text-white">{card.front}</td>
              <td className="px-6 py-4 text-center text-white">{card.back}</td>
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
        <div className="flex justify-end mt-6">
          <Button asChild className="bg-[#7f1d1d] hover:bg-[#581313] text-white rounded px-4 py-2">
            <a href="/dashboard">Back</a>
          </Button>
        </div>
      </div>
    );
};

export default FlashcardList;
