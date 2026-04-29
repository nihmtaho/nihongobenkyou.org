-- ============================================================
-- Migration: 20260426000004_kanji_cards
-- Creates: kanji_cards table for kanji SRS state sync
-- RLS enabled (user_id = auth.uid())
-- UPSERT conflict: last-write-wins on updated_at
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kanji_cards (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  char          text        NOT NULL,
  interval_days integer     NOT NULL DEFAULT 0,
  ease_factor   real        NOT NULL DEFAULT 2.5,
  due_date      date        NOT NULL DEFAULT CURRENT_DATE,
  review_count  integer     NOT NULL DEFAULT 0,
  last_rating   smallint    NULL CHECK (last_rating BETWEEN 0 AND 3),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, char)
);

ALTER TABLE public.kanji_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanji_cards: users manage own rows"
  ON public.kanji_cards
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for efficient due-date queries per user
CREATE INDEX IF NOT EXISTS kanji_cards_user_due
  ON public.kanji_cards (user_id, due_date);
