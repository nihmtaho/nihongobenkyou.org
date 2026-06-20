-- Add reminder_time (HH:MM, e.g. '08:00') to user_push_subscriptions.
-- NULL means use the cron schedule's default time. Default 08:00 matches the existing cron.
ALTER TABLE user_push_subscriptions
  ADD COLUMN IF NOT EXISTS reminder_time TEXT DEFAULT '08:00';
