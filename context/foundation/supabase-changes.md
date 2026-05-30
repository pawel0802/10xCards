-- Migration: Adapt schema for FSRS algorithm (ts-fsrs compatible)
-- Drops SM-2 columns (ease_factor) and adds FSRS core metrics.

-- Czyszczenie starych powiązań (Cascade usunie też widoki/zależności jeśli istnieją)
DROP TABLE IF EXISTS public.review_logs CASCADE;
DROP TABLE IF EXISTS public.flashcards CASCADE;

-- ============================================================
-- Funkcja Triggera: Automatyczna aktualizacja updated_at
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
-- Tabela: flashcards (Dostosowana do ts-fsrs Card)
-- ============================================================
CREATE TABLE public.flashcards (
id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
front         text          NOT NULL CHECK (char_length(front) > 0),
back          text          NOT NULL CHECK (char_length(back) > 0),
source        text          NOT NULL CHECK (source IN ('auto', 'manual', 'hybrid')),

-- FSRS State: 0=New, 1=Learning, 2=Review, 3=Relearning
state         smallint      NOT NULL DEFAULT 0 CHECK (state BETWEEN 0 AND 3),

-- Metryki algorytmu ts-fsrs
stability     numeric(8,4)  NOT NULL DEFAULT 0.0 CHECK (stability >= 0.0),
difficulty    numeric(8,4)  NOT NULL DEFAULT 0.0 CHECK (difficulty >= 0.0),
reps          integer       NOT NULL DEFAULT 0 CHECK (reps >= 0),
lapses        integer       NOT NULL DEFAULT 0 CHECK (lapses >= 0),

-- Harmonogram
due_date      timestamptz   NOT NULL DEFAULT now(),
last_review   timestamptz   DEFAULT NULL, -- Kluczowe: timestamp ostatniej faktycznej powtórki

-- Metadane systemowe
created_at    timestamptz   NOT NULL DEFAULT now(),
updated_at    timestamptz   NOT NULL DEFAULT now()
);

-- RLS (Row Level Security) dla flashcards
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flashcards_select_own" ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "flashcards_insert_own" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "flashcards_update_own" ON public.flashcards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "flashcards_delete_own" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

-- Trigger dla updated_at
CREATE TRIGGER set_flashcards_updated_at
BEFORE UPDATE ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Indeksy wydajnościowe (Kluczowe pod pobieranie paczek kart "na dziś")
CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_user_state_due ON public.flashcards(user_id, state, due_date);

-- ============================================================
-- Tabela: review_logs (Dostosowana do FSRS Optimizer / @open-spaced-repetition/binding)
-- ============================================================
CREATE TABLE public.review_logs (
id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
user_id        uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
flashcard_id   uuid          NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,

-- Rating ts-fsrs: 1=Again, 2=Hard, 3=Good, 4=Easy
rating         smallint      NOT NULL CHECK (rating BETWEEN 1 AND 4),

-- Logowanie stanu PRZED powtórką (wymagane do analizy i treningu parametrów)
state          smallint      NOT NULL CHECK (state BETWEEN 0 AND 3),
elapsed_days   integer       NOT NULL CHECK (elapsed_days >= 0),
scheduled_days integer       NOT NULL CHECK (scheduled_days >= 0),

reviewed_at    timestamptz   NOT NULL DEFAULT now()
);

-- RLS dla review_logs (Append-only: tylko SELECT i INSERT)
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_logs_select_own" ON public.review_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "review_logs_insert_own" ON public.review_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indeksy dla logów
CREATE INDEX idx_review_logs_user_id ON public.review_logs(user_id);
CREATE INDEX idx_review_logs_flashcard_id ON public.review_logs(flashcard_id);
