-- ============================================================
-- Migration: 20260426000002_custom_deck
-- Creates: custom_decks, custom_vocabulary tables
-- RLS: owner full CRUD + anon SELECT on public decks
-- ============================================================

-- ----------------------------------------------------------------
-- custom_decks
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_decks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL CHECK (char_length(title) <= 100),
  description text,
  is_public   boolean     NOT NULL DEFAULT false,
  share_code  text        NOT NULL UNIQUE,
  word_count  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_decks_user_id_idx ON public.custom_decks (user_id);

ALTER TABLE public.custom_decks ENABLE ROW LEVEL SECURITY;

-- Owner: full access
CREATE POLICY "custom_decks_owner_all"
  ON public.custom_decks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anon: read public decks only
CREATE POLICY "custom_decks_anon_read_public"
  ON public.custom_decks
  FOR SELECT
  TO anon
  USING (is_public = true);

-- ----------------------------------------------------------------
-- custom_vocabulary
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_vocabulary (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     uuid        NOT NULL REFERENCES public.custom_decks(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kana        text        NOT NULL,
  kanji       text,
  meaning_vi  text        NOT NULL,
  meaning_en  text,
  pitch_pattern integer,
  source      text        NOT NULL CHECK (source IN ('manual', 'csv', 'imported')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_vocabulary_deck_id_idx  ON public.custom_vocabulary (deck_id);
CREATE INDEX IF NOT EXISTS custom_vocabulary_user_id_idx  ON public.custom_vocabulary (user_id);
CREATE INDEX IF NOT EXISTS custom_vocabulary_deck_id_id_idx ON public.custom_vocabulary (deck_id, id);

ALTER TABLE public.custom_vocabulary ENABLE ROW LEVEL SECURITY;

-- Owner: full access
CREATE POLICY "custom_vocabulary_owner_all"
  ON public.custom_vocabulary
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anon: read words from public decks only
CREATE POLICY "custom_vocabulary_anon_read_public"
  ON public.custom_vocabulary
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_decks d
      WHERE d.id = custom_vocabulary.deck_id
        AND d.is_public = true
    )
  );
