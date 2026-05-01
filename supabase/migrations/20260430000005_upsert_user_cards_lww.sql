-- Migration: upsert_user_cards_lww
-- Purpose: Conditional batch UPSERT for user_cards with last-write-wins on updated_at.
-- PostgREST's standard .upsert() endpoint does not support a WHERE clause on the conflict
-- action, so this RPC function is required to enforce the timestamp guard server-side.
-- Security: SECURITY INVOKER (default) — Supabase RLS on user_cards applies, so callers
-- can only write rows where user_id = auth.uid().

CREATE OR REPLACE FUNCTION public.upsert_user_cards_lww(p_rows jsonb)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public.user_cards (
    user_id,
    vocab_id,
    book_source,
    interval_days,
    ease_factor,
    due_date,
    review_count,
    last_rating,
    updated_at,
    is_known
  )
  SELECT
    (r->>'user_id')::uuid,
    r->>'vocab_id',
    r->>'book_source',
    (r->>'interval_days')::integer,
    (r->>'ease_factor')::double precision,
    (r->>'due_date')::date,
    (r->>'review_count')::integer,
    NULLIF(r->>'last_rating', 'null')::smallint,
    (r->>'updated_at')::timestamptz,
    (r->>'is_known')::boolean
  FROM jsonb_array_elements(p_rows) AS r
  ON CONFLICT (user_id, vocab_id) DO UPDATE SET
    book_source   = EXCLUDED.book_source,
    interval_days = EXCLUDED.interval_days,
    ease_factor   = EXCLUDED.ease_factor,
    due_date      = EXCLUDED.due_date,
    review_count  = EXCLUDED.review_count,
    last_rating   = EXCLUDED.last_rating,
    updated_at    = EXCLUDED.updated_at,
    is_known      = EXCLUDED.is_known
  WHERE EXCLUDED.updated_at > public.user_cards.updated_at;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_cards_lww(jsonb) TO authenticated;
