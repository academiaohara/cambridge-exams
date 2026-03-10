-- sql/init-supabase.sql
-- Supabase database setup for Cambridge Exams
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Profiles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT        UNIQUE NOT NULL,
  full_name      TEXT,
  avatar_url     TEXT,
  preferred_level    TEXT    DEFAULT 'C1',
  preferred_mode     TEXT    DEFAULT 'practice',
  preferred_language TEXT    DEFAULT 'es',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── User streaks ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak   INT         DEFAULT 0,
  longest_streak   INT         DEFAULT 0,
  last_activity    DATE,
  total_days_active INT        DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── User progress ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  level        TEXT,
  exam_id      TEXT,
  section      TEXT,
  part         INT,
  answers      JSONB,
  score        INT,
  mode         TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, exam_id, section, part, mode)
);

-- ── Exam sessions (24-hour lock) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id      TEXT,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  final_score  INT,
  next_attempt TIMESTAMPTZ,
  UNIQUE (user_id, exam_id)
);

-- ── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions  ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_streaks
CREATE POLICY "streaks_select" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "streaks_insert" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streaks_update" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- user_progress
CREATE POLICY "progress_select" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "progress_insert" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- exam_sessions
CREATE POLICY "sessions_select" ON public.exam_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert" ON public.exam_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update" ON public.exam_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- ── Auto-create profile on signup ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
