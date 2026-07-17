-- Add active_dates column used by js/streak-manager.js cloud sync
ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS active_dates JSONB DEFAULT '[]'::jsonb;
