export interface Database {
  public: {
    Tables: {
      flashcards: {
        Row: {
          id: string;
          user_id: string;
          front?: string;
          back?: string;
          created_at?: string;
          due_date?: string | null;
          source?: string;
        };
        Insert: {
          user_id: string;
          front: string;
          back: string;
          created_at: string;
          source?: string;
          due_date?: string | null;
        };
      };
      review_logs: {
        Row: { id: string; flashcard_id: string; user_id: string };
        Insert: { flashcard_id: string; user_id: string };
      };
    };
  };
}
