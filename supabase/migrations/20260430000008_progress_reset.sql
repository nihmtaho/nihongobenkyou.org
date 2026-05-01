-- Migration: add progress_reset_at to profiles
-- Allows clients to skip pre-reset review_log events when syncing
-- after a "đặt lại tiến trình" (reset progress) action.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS progress_reset_at timestamptz NULL;
