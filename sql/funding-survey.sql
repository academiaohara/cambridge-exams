-- sql/funding-survey.sql
-- Run in Supabase SQL Editor to store funding preference survey responses.

CREATE TABLE IF NOT EXISTS public.funding_survey_responses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  choice     TEXT        NOT NULL CHECK (choice IN ('ads_optional_sub', 'subscription_only')),
  comment    TEXT,
  level      TEXT,
  is_guest   BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.funding_survey_responses ENABLE ROW LEVEL SECURITY;

-- API inserts via user JWT or anon key (see api/funding-survey.js)
CREATE POLICY "funding_survey_insert" ON public.funding_survey_responses
  FOR INSERT WITH CHECK (true);

-- Optional: allow users to read only their own rows
CREATE POLICY "funding_survey_select_own" ON public.funding_survey_responses
  FOR SELECT USING (auth.uid() = user_id);
