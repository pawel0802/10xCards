-- Migration: 20260601_create_fsrs_flashcards_and_review_logs.sql
-- Creates FSRS-ready flashcards and review_logs, enables RLS and provides a server-friendly RPC

BEGIN;

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================
-- flashcards table (FSRS fields)
-- ======================================================
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  due_date timestamptz,
  state smallint NOT NULL DEFAULT 0,
  stability numeric NOT NULL DEFAULT 1,
  difficulty numeric NOT NULL DEFAULT 0.3,
  reps integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  last_review timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (authenticated users may only act on their rows)
CREATE POLICY IF NOT EXISTS flashcards_owner_select ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS flashcards_owner_insert ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS flashcards_owner_update ON public.flashcards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS flashcards_owner_delete ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

-- ======================================================
-- review_logs table (audit + optimizer-ready fields)
-- ======================================================
CREATE TABLE IF NOT EXISTS public.review_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flashcard_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  prior_state jsonb NOT NULL,
  elapsed_days numeric,
  scheduled_days numeric,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS review_logs_owner_select ON public.review_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS review_logs_owner_insert ON public.review_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS review_logs_owner_update ON public.review_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS review_logs_idempotency_idx ON public.review_logs (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ======================================================
-- RPC: record_review
-- Design: This RPC accepts server-computed scheduler output (p_next_state JSONB and optional p_next_due)
-- and persists them atomically under FOR UPDATE locking. The server (Node/Worker) SHOULD compute the
-- next_state using ts-fsrs and call this RPC to persist the result. The function implements basic
-- validation and an idempotency_key shortcut.
-- NOTE: This function is SECURITY DEFINER to allow the server to persist updates atomically; audit
-- the function body & owner before merging.
-- ======================================================
CREATE OR REPLACE FUNCTION public.record_review(
  p_user_id uuid,
  p_flashcard_id uuid,
  p_rating smallint,
  p_next_state jsonb,
  p_next_due timestamptz DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_flashcard public.flashcards%ROWTYPE;
  v_prior_state jsonb;
  v_review_log_id uuid;
  v_elapsed_days numeric;
  v_scheduled_days numeric;
BEGIN
  -- Basic validation
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 4 THEN
    RAISE EXCEPTION 'invalid rating';
  END IF;

  SELECT * INTO v_flashcard FROM public.flashcards WHERE id = p_flashcard_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'flashcard not found';
  END IF;

  IF v_flashcard.user_id::text <> p_user_id::text THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Idempotency: if idempotency_key provided and a review exists, return existing id
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_review_log_id FROM public.review_logs WHERE idempotency_key = p_idempotency_key AND flashcard_id = p_flashcard_id AND user_id = p_user_id LIMIT 1;
    IF v_review_log_id IS NOT NULL THEN
      RETURN v_review_log_id;
    END IF;
  END IF;

  v_prior_state := jsonb_build_object(
    'state', v_flashcard.state,
    'stability', v_flashcard.stability,
    'difficulty', v_flashcard.difficulty,
    'reps', v_flashcard.reps,
    'lapses', v_flashcard.lapses,
    'last_review', v_flashcard.last_review
  );

  IF v_flashcard.last_review IS NULL THEN
    v_elapsed_days := NULL;
  ELSE
    v_elapsed_days := EXTRACT(epoch FROM (now() - v_flashcard.last_review)) / 86400.0;
  END IF;

  IF v_flashcard.due_date IS NULL OR p_next_due IS NULL THEN
    v_scheduled_days := NULL;
  ELSE
    v_scheduled_days := EXTRACT(epoch FROM (p_next_due - v_flashcard.due_date)) / 86400.0;
  END IF;

  -- Persist updated flashcard fields (server-supplied)
  UPDATE public.flashcards SET
    state = (p_next_state->>'state')::smallint,
    stability = (p_next_state->>'stability')::numeric,
    difficulty = (p_next_state->>'difficulty')::numeric,
    reps = (p_next_state->>'reps')::integer,
    lapses = (p_next_state->>'lapses')::integer,
    last_review = now(),
    due_date = COALESCE(p_next_due, due_date),
    updated_at = now()
  WHERE id = p_flashcard_id;

  INSERT INTO public.review_logs (id, user_id, flashcard_id, rating, prior_state, elapsed_days, scheduled_days, reviewed_at, idempotency_key)
  VALUES (gen_random_uuid(), p_user_id, p_flashcard_id, p_rating, v_prior_state, v_elapsed_days, v_scheduled_days, now(), p_idempotency_key)
  RETURNING id INTO v_review_log_id;

  RETURN v_review_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.record_review IS 'SECURITY DEFINER function that persists server-computed scheduler outputs atomically. Audit before deployment.';

COMMIT;
