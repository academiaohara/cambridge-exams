-- ═══════════════════════════════════════════════════════════════════════════
-- sql/setup-database.sql
-- CONFIGURACIÓN COMPLETA DE LA BASE DE DATOS (Supabase)
--
-- CÓMO USARLO (paso a paso):
--   1. Entra en https://supabase.com y abre tu proyecto.
--   2. En el menú de la izquierda pulsa "SQL Editor".
--   3. Pulsa "New query" (nueva consulta).
--   4. Copia y pega TODO este archivo.
--   5. Pulsa "Run" (o Ctrl+Enter).
--
-- Es seguro ejecutarlo varias veces: no borra nada, solo crea lo que falta.
-- NO toca los datos que ya existen en la tabla "profiles".
--
-- Crea todo lo que la aplicación necesita:
--   • profiles                 → datos del usuario (se conserva, solo se completa)
--   • user_progress            → progreso de exámenes, curso, fast learning, etc.
--   • user_streaks             → racha de días de estudio
--   • crossword_progress       → progreso de los crucigramas
--   • funding_survey_responses → respuestas de la encuesta
--   • ai_usage_daily           → límite diario de usos de IA (writing/speaking)
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. PROFILES (ya existe: solo se asegura de que tenga todas las columnas) ─
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

-- Columnas que la app usa y que podrían faltar en tu tabla actual
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role            TEXT    DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS has_theory_pack BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_exams_pack  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS animal_avatar   TEXT,
  ADD COLUMN IF NOT EXISTS preferred_level    TEXT DEFAULT 'C1',
  ADD COLUMN IF NOT EXISTS preferred_mode     TEXT DEFAULT 'practice',
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Cuenta de administrador
UPDATE public.profiles SET role = 'admin', has_theory_pack = TRUE, has_exams_pack = TRUE
  WHERE email = 'illanlinos@gmail.com';


-- ── 2. USER_PROGRESS (todo el progreso: exámenes, curso, fast learning…) ────
CREATE TABLE IF NOT EXISTS public.user_progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level        TEXT,
  exam_id      TEXT        NOT NULL,
  section      TEXT        NOT NULL,
  part         INT         NOT NULL,
  answers      JSONB,
  score        INT,
  mode         TEXT        NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, exam_id, section, part, mode)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user
  ON public.user_progress (user_id);


-- ── 3. USER_STREAKS (racha de días) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak    INT         DEFAULT 0,
  longest_streak    INT         DEFAULT 0,
  last_activity     DATE,
  total_days_active INT         DEFAULT 0,
  active_dates      JSONB       DEFAULT '[]'::jsonb,
  current_streak_ended_at TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Por si la tabla ya existía sin estas columnas
ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS active_dates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_streak_ended_at TIMESTAMPTZ;


-- ── 4. CROSSWORD_PROGRESS (crucigramas) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crossword_progress (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crossword_id        TEXT        NOT NULL,
  level               TEXT        NOT NULL,
  cw_index            INT         NOT NULL DEFAULT 0,
  completed           BOOLEAN     NOT NULL DEFAULT FALSE,
  words_correct       INT         NOT NULL DEFAULT 0,
  words_total         INT         NOT NULL DEFAULT 0,
  progress_pct        INT         NOT NULL DEFAULT 0,
  hints_used          INT         NOT NULL DEFAULT 0,
  time_spent_seconds  INT         NOT NULL DEFAULT 0,
  cell_state          JSONB       DEFAULT '{}'::jsonb,
  last_played         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, crossword_id)
);

CREATE INDEX IF NOT EXISTS idx_cw_progress_user
  ON public.crossword_progress (user_id);

-- Actualiza updated_at automáticamente al modificar una fila
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cw_progress_updated_at ON public.crossword_progress;
CREATE TRIGGER trg_cw_progress_updated_at
  BEFORE UPDATE ON public.crossword_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 5. FUNDING_SURVEY_RESPONSES (encuesta) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.funding_survey_responses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  choice     TEXT        NOT NULL CHECK (choice IN ('ads_optional_sub', 'subscription_only')),
  comment    TEXT,
  level      TEXT,
  is_guest   BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── 6. AI_USAGE_DAILY (límite diario de IA) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL CHECK (feature IN ('writing', 'speaking')),
  usage_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  count       INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, feature, usage_date)
);

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


-- ── 7. SEGURIDAD (RLS: cada usuario solo ve y toca SUS datos) ───────────────
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crossword_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_daily           ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_progress
DROP POLICY IF EXISTS "progress_select" ON public.user_progress;
CREATE POLICY "progress_select" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "progress_insert" ON public.user_progress;
CREATE POLICY "progress_insert" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "progress_update" ON public.user_progress;
CREATE POLICY "progress_update" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- user_streaks
DROP POLICY IF EXISTS "streaks_select" ON public.user_streaks;
CREATE POLICY "streaks_select" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "streaks_insert" ON public.user_streaks;
CREATE POLICY "streaks_insert" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "streaks_update" ON public.user_streaks;
CREATE POLICY "streaks_update" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- crossword_progress
DROP POLICY IF EXISTS "Users can read own crossword progress" ON public.crossword_progress;
CREATE POLICY "Users can read own crossword progress"
  ON public.crossword_progress FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own crossword progress" ON public.crossword_progress;
CREATE POLICY "Users can insert own crossword progress"
  ON public.crossword_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own crossword progress" ON public.crossword_progress;
CREATE POLICY "Users can update own crossword progress"
  ON public.crossword_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- funding_survey_responses (cualquiera puede responder, solo lees lo tuyo)
DROP POLICY IF EXISTS "funding_survey_insert" ON public.funding_survey_responses;
CREATE POLICY "funding_survey_insert" ON public.funding_survey_responses
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "funding_survey_select_own" ON public.funding_survey_responses;
CREATE POLICY "funding_survey_select_own" ON public.funding_survey_responses
  FOR SELECT USING (auth.uid() = user_id);

-- ai_usage_daily (solo lectura propia; escribe la función)
DROP POLICY IF EXISTS "ai_usage_select_own" ON public.ai_usage_daily;
CREATE POLICY "ai_usage_select_own" ON public.ai_usage_daily
  FOR SELECT USING (auth.uid() = user_id);


-- ── 8. Crear perfil automáticamente al registrarse ──────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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


-- ── 9. Comprobación final: debe listar las 6 tablas ─────────────────────────
SELECT table_name AS "Tablas creadas correctamente"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'user_progress', 'user_streaks',
    'crossword_progress', 'funding_survey_responses', 'ai_usage_daily'
  )
ORDER BY table_name;
