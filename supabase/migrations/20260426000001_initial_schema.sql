-- ============================================================
-- Migration: 20260426000001_initial_schema
-- Creates: profiles, user_cards tables + avatars storage bucket
-- RLS enabled on all tables (user_id = auth.uid())
-- ============================================================

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text      NOT NULL DEFAULT '',
  avatar_url   text      NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: users manage own row"
  ON public.profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- user_cards  (SRS index — no vocabulary content)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_cards (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocab_id     text        NOT NULL,
  book_source  text        NOT NULL,
  interval_days integer    NOT NULL DEFAULT 1,
  ease_factor  real        NOT NULL DEFAULT 2.5,
  due_date     date        NOT NULL,
  review_count integer     NOT NULL DEFAULT 0,
  last_rating  smallint    NULL CHECK (last_rating BETWEEN 0 AND 3),
  is_known     boolean     NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_cards_user_vocab_unique UNIQUE (user_id, vocab_id)
);

CREATE INDEX IF NOT EXISTS user_cards_user_id_idx      ON public.user_cards (user_id);
CREATE INDEX IF NOT EXISTS user_cards_due_date_idx     ON public.user_cards (user_id, due_date);
CREATE INDEX IF NOT EXISTS user_cards_book_source_idx  ON public.user_cards (user_id, book_source);

ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_cards: users manage own rows"
  ON public.user_cards
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- avatars Storage bucket
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/update their own avatar
CREATE POLICY "avatars: owner upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars: owner update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars: owner delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars: owner read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
