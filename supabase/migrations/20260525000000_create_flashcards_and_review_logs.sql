-- Migration: create flashcards and review_logs tables
-- F-01: Foundational data schema for 10xCards
-- Applies via: npx supabase db push (hosted project: ienydkltkzzxsxvtquxe.supabase.co)

-- ============================================================
-- Trigger function: auto-update updated_at on flashcards
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Table: flashcards
-- ============================================================

CREATE TABLE public.flashcards (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front        text        NOT NULL CHECK (char_length(front) > 0),
  back         text        NOT NULL CHECK (char_length(back) > 0),
  source       text        NOT NULL CHECK (source IN ('auto', 'manual', 'hybrid')),
  due_date     timestamptz NOT NULL DEFAULT now(),
  interval_days integer    NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  ease_factor  numeric(4,3) NOT NULL DEFAULT 2.5 CHECK (ease_factor >= 1.0),
  repetitions  integer     NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flashcards_select_own"
  ON public.flashcards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "flashcards_insert_own"
  ON public.flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "flashcards_update_own"
  ON public.flashcards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "flashcards_delete_own"
  ON public.flashcards FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_user_due ON public.flashcards(user_id, due_date);

-- ============================================================
-- Table: review_logs (append-only — no UPDATE/DELETE policies)
-- ============================================================

CREATE TABLE public.review_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id uuid        NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  rating       smallint    NOT NULL CHECK (rating BETWEEN 1 AND 4), -- 1=Again 2=Hard 3=Good 4=Easy
  reviewed_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_logs_select_own"
  ON public.review_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "review_logs_insert_own"
  ON public.review_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_review_logs_flashcard_id ON public.review_logs(flashcard_id);
CREATE INDEX idx_review_logs_user_id ON public.review_logs(user_id);
