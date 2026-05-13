-- Migration: add FSRS-4.5 columns to review_log and relax rating constraints
-- Existing SM-2 columns (interval_days, ease_factor) kept nullable for old-client compat.

-- ----------------------------------------------------------------
-- review_log: add FSRS columns, relax rating constraint
-- ----------------------------------------------------------------

-- Allow FSRS ratings 1–4 (old SM-2 rows had 0–3; extend to cover both)
ALTER TABLE public.review_log
  DROP CONSTRAINT IF EXISTS review_log_rating_check;
ALTER TABLE public.review_log
  ADD CONSTRAINT review_log_rating_check CHECK (rating BETWEEN 0 AND 4);

-- FSRS fields (nullable — old rows won't have them)
ALTER TABLE public.review_log
  ADD COLUMN IF NOT EXISTS scheduled_days integer  NULL,
  ADD COLUMN IF NOT EXISTS stability      real     NULL,
  ADD COLUMN IF NOT EXISTS difficulty     real     NULL;

-- SM-2 fields become nullable (old rows keep their values; new rows omit them)
ALTER TABLE public.review_log
  ALTER COLUMN interval_days DROP NOT NULL,
  ALTER COLUMN ease_factor   DROP NOT NULL;

-- ----------------------------------------------------------------
-- user_card_snapshots: relax last_rating constraint
-- ----------------------------------------------------------------
ALTER TABLE public.user_card_snapshots
  DROP CONSTRAINT IF EXISTS user_card_snapshots_last_rating_check;
ALTER TABLE public.user_card_snapshots
  ADD CONSTRAINT user_card_snapshots_last_rating_check CHECK (last_rating BETWEEN 0 AND 4);
