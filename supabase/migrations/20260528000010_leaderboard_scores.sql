-- ============================================================
-- Migration: 20260528000010_leaderboard_scores
-- Creates leaderboard_scores table (1 row per user per week),
-- a trigger that increments the count on every review_log INSERT,
-- and the get_weekly_leaderboard() RPC (SECURITY DEFINER).
-- ============================================================

-- ----------------------------------------------------------------
-- leaderboard_scores
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leaderboard_scores (
  user_id        uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start     date    NOT NULL,   -- ISO Monday in UTC+7
  cards_reviewed integer NOT NULL DEFAULT 0,
  CONSTRAINT leaderboard_scores_pk PRIMARY KEY (user_id, week_start)
);

-- Fast top-N read for the current week
CREATE INDEX IF NOT EXISTS idx_leaderboard_scores_week_rank
  ON public.leaderboard_scores (week_start, cards_reviewed DESC);

-- ----------------------------------------------------------------
-- RLS: anyone can read (scores are public); no direct client writes
-- ----------------------------------------------------------------
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaderboard_scores: public read"
  ON public.leaderboard_scores FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policy for authenticated role:
-- only the trigger function (SECURITY DEFINER) writes this table.

GRANT SELECT ON public.leaderboard_scores TO anon, authenticated;

-- ----------------------------------------------------------------
-- Trigger function: increment on each review_log INSERT
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_leaderboard_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
BEGIN
  -- Monday of the ISO week containing reviewed_at, in UTC+7
  v_week_start := date_trunc('week',
    NEW.reviewed_at AT TIME ZONE 'Asia/Ho_Chi_Minh'
  )::date;

  INSERT INTO public.leaderboard_scores (user_id, week_start, cards_reviewed)
  VALUES (NEW.user_id, v_week_start, 1)
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET cards_reviewed = leaderboard_scores.cards_reviewed + 1;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_log_insert
  AFTER INSERT ON public.review_log
  FOR EACH ROW EXECUTE FUNCTION public.increment_leaderboard_score();

-- ----------------------------------------------------------------
-- RPC: get_weekly_leaderboard(p_limit int DEFAULT 20)
-- Returns top p_limit rows for the current ISO week + calling
-- user's row (always included even if rank > p_limit).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_limit int DEFAULT 20)
RETURNS TABLE (
  rank            bigint,
  user_id         uuid,
  display_name    text,
  avatar_url      text,
  cards_reviewed  integer,
  is_current_user boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH current_week AS (
    SELECT date_trunc('week',
      now() AT TIME ZONE 'Asia/Ho_Chi_Minh'
    )::date AS week_start
  ),
  ranked AS (
    SELECT
      RANK() OVER (ORDER BY ls.cards_reviewed DESC) AS rank,
      ls.user_id,
      COALESCE(NULLIF(p.display_name, ''), split_part(u.email, '@', 1), 'Người dùng') AS display_name,
      p.avatar_url,
      ls.cards_reviewed,
      ls.user_id = auth.uid() AS is_current_user
    FROM leaderboard_scores ls
    JOIN current_week cw ON ls.week_start = cw.week_start
    LEFT JOIN profiles p ON ls.user_id = p.user_id
    LEFT JOIN auth.users u ON ls.user_id = u.id
  )
  SELECT * FROM ranked WHERE rank <= p_limit
  UNION ALL
  SELECT * FROM ranked WHERE is_current_user = true AND rank > p_limit
  ORDER BY rank
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard(int) TO authenticated;

-- ----------------------------------------------------------------
-- Backfill: populate leaderboard_scores from existing review_log
-- ----------------------------------------------------------------
INSERT INTO public.leaderboard_scores (user_id, week_start, cards_reviewed)
SELECT
  user_id,
  date_trunc('week', reviewed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS week_start,
  COUNT(*)::integer AS cards_reviewed
FROM public.review_log
GROUP BY user_id, date_trunc('week', reviewed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
ON CONFLICT (user_id, week_start)
DO UPDATE SET cards_reviewed = EXCLUDED.cards_reviewed;
