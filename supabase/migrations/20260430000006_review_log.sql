-- Migration: review_log + user_card_snapshots
-- Replaces the mutable user_cards UPSERT sync with append-only event log.
-- user_cards and kanji_cards are NOT dropped — they remain as snapshot tables
-- for existing clients during the migration window.

-- ----------------------------------------------------------------
-- review_log  (append-only, one row per review event)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_log (
  id            bigserial     PRIMARY KEY,
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocab_id      text          NOT NULL,
  book_source   text          NOT NULL,
  card_type     text          NOT NULL DEFAULT 'vocab' CHECK (card_type IN ('vocab', 'kanji')),
  rating        smallint      NOT NULL CHECK (rating BETWEEN 0 AND 3),
  interval_days integer       NOT NULL,
  ease_factor   real          NOT NULL,
  due_date      date          NOT NULL,
  review_count  integer       NOT NULL,
  is_known      boolean       NOT NULL DEFAULT false,
  reviewed_at   timestamptz   NOT NULL DEFAULT now()
);

-- Incremental sync: the only query pattern needed
CREATE INDEX IF NOT EXISTS idx_review_log_user_cursor
  ON public.review_log (user_id, id);

-- Replay per card (used for reconstruction and analytics)
CREATE INDEX IF NOT EXISTS idx_review_log_user_vocab
  ON public.review_log (user_id, vocab_id, card_type);

ALTER TABLE public.review_log ENABLE ROW LEVEL SECURITY;

-- Append-only: INSERT + SELECT only. No UPDATE / DELETE policy.
CREATE POLICY "review_log: insert own rows"
  ON public.review_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "review_log: read own rows"
  ON public.review_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------
-- user_card_snapshots  (fast-bootstrap for new devices)
-- One row per (user, vocab/kanji). Updated after each study session.
-- cursor_id = id of last review_log row included in this snapshot.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_card_snapshots (
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocab_id      text          NOT NULL,
  card_type     text          NOT NULL DEFAULT 'vocab' CHECK (card_type IN ('vocab', 'kanji')),
  interval_days integer       NOT NULL,
  ease_factor   real          NOT NULL,
  due_date      date          NOT NULL,
  review_count  integer       NOT NULL,
  last_rating   smallint      NULL CHECK (last_rating BETWEEN 0 AND 3),
  is_known      boolean       NOT NULL DEFAULT false,
  snapshot_at   timestamptz   NOT NULL DEFAULT now(),
  cursor_id     bigint        NOT NULL DEFAULT 0,

  CONSTRAINT user_card_snapshots_pk PRIMARY KEY (user_id, vocab_id, card_type)
);

CREATE INDEX IF NOT EXISTS idx_user_card_snapshots_user
  ON public.user_card_snapshots (user_id, card_type);

ALTER TABLE public.user_card_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_card_snapshots: manage own rows"
  ON public.user_card_snapshots FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- Backfill user_card_snapshots from existing user_cards / kanji_cards
-- cursor_id = 0 means "no review_log events exist yet — snapshot is authoritative"
-- ----------------------------------------------------------------
INSERT INTO public.user_card_snapshots (
  user_id, vocab_id, card_type,
  interval_days, ease_factor, due_date,
  review_count, last_rating, is_known,
  snapshot_at, cursor_id
)
SELECT
  user_id, vocab_id, 'vocab',
  interval_days, ease_factor, due_date,
  review_count, last_rating, is_known,
  updated_at, 0
FROM public.user_cards
ON CONFLICT (user_id, vocab_id, card_type) DO NOTHING;

INSERT INTO public.user_card_snapshots (
  user_id, vocab_id, card_type,
  interval_days, ease_factor, due_date,
  review_count, last_rating, is_known,
  snapshot_at, cursor_id
)
SELECT
  user_id, char AS vocab_id, 'kanji',
  interval_days, ease_factor, due_date,
  review_count, last_rating, false,
  updated_at, 0
FROM public.kanji_cards
ON CONFLICT (user_id, vocab_id, card_type) DO NOTHING;

GRANT SELECT, INSERT ON public.review_log           TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_card_snapshots TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.review_log_id_seq TO authenticated;
