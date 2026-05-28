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
          <Button asChild variant="default"><a href="/generate">Generate the first one</a></Button>
          <Button asChild variant="destructive"><a href="/dashboard">Back</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="p-2 border">Front</th>
            <th className="p-2 border">Back</th>
          </tr>
        </thead>
        <tbody>
          {flashcards.map((card) => (
            <tr key={card.id}>
              <td className="p-2 border">{card.front}</td>
              <td className="p-2 border">{card.back}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between items-center mt-4">
        <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
  Previous
</Button>
        <span>
          Page {page} of {Math.max(1, Math.ceil(count / 10))}
        </span>
        <Button variant="secondary" onClick={() => setPage((p) => (p * 10 < count ? p + 1 : p))} disabled={page * 10 >= count}>
  Next
</Button>
      </div>
    </div>
  );
};

export default FlashcardList;
