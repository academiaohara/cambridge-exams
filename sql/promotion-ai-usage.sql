-- sql/promotion-ai-usage.sql
-- Run in Supabase SQL Editor when enabling PROMOTION_MODE (server env + CONFIG flag).

CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL CHECK (feature IN ('writing', 'speaking')),
  usage_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  count       INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, feature, usage_date)
);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_select_own" ON public.ai_usage_daily
  FOR SELECT USING (auth.uid() = user_id);

-- Atomic check + increment (called with user JWT from API routes)
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(p_feature TEXT, p_limit INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count   INT;
  v_date    DATE := CURRENT_DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'not_authenticated');
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 5;
  END IF;

  INSERT INTO public.ai_usage_daily (user_id, feature, usage_date, count)
  VALUES (v_user_id, p_feature, v_date, 0)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  SELECT count INTO v_count
  FROM public.ai_usage_daily
  WHERE user_id = v_user_id AND feature = p_feature AND usage_date = v_date
  FOR UPDATE;

  IF v_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'limit', p_limit,
      'feature', p_feature
    );
  END IF;

  UPDATE public.ai_usage_daily
  SET count = count + 1
  WHERE user_id = v_user_id AND feature = p_feature AND usage_date = v_date;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_limit - v_count - 1,
    'limit', p_limit,
    'feature', p_feature
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(TEXT, INT) TO authenticated;

-- Read-only quota (no increment)
CREATE OR REPLACE FUNCTION public.get_ai_usage_quota(p_feature TEXT, p_limit INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count   INT := 0;
  v_date    DATE := CURRENT_DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 5;
  END IF;

  SELECT COALESCE(count, 0) INTO v_count
  FROM public.ai_usage_daily
  WHERE user_id = v_user_id AND feature = p_feature AND usage_date = v_date;

  RETURN jsonb_build_object(
    'feature', p_feature,
    'remaining', GREATEST(0, p_limit - v_count),
    'limit', p_limit,
    'used', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_ai_usage_quota(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_quota(TEXT, INT) TO authenticated;
