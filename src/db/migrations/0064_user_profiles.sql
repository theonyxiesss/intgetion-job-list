-- D503: one shared "about me" profile per person, read by every role
-- (candidate, creator, employer). Filled once from the role profiles: the
-- name from the candidate, then the employer, then the creator (who may use
-- a nickname). Contacts and links stay where they are.
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text,
  country char(2),
  city text,
  timezone text,
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  about text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_display_name_check
    CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 120),
  CONSTRAINT user_profiles_country_check
    CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  CONSTRAINT user_profiles_city_check
    CHECK (city IS NULL OR char_length(city) BETWEEN 1 AND 120),
  CONSTRAINT user_profiles_timezone_check
    CHECK (timezone IS NULL OR char_length(timezone) BETWEEN 1 AND 64),
  CONSTRAINT user_profiles_languages_check
    CHECK (jsonb_typeof(languages) = 'array'),
  CONSTRAINT user_profiles_about_check
    CHECK (about IS NULL OR char_length(about) <= 1000)
);

SELECT public.enable_rls_deny_all('public.user_profiles');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO app_rw;

INSERT INTO public.user_profiles (user_id, display_name, country, city, timezone, languages)
SELECT
  u.id,
  left(
    COALESCE(
      NULLIF(btrim(cp.full_name), ''),
      NULLIF(btrim(ep.full_name), ''),
      NULLIF(btrim(cr.display_name), '')
    ),
    120
  ),
  COALESCE(
    cp.country,
    CASE WHEN upper(cr.country) ~ '^[A-Z]{2}$' THEN upper(cr.country) END
  ),
  left(NULLIF(btrim(cp.city), ''), 120),
  left(NULLIF(btrim(cp.timezone), ''), 64),
  COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('code', cl.lang, 'level', cl.level::text) ORDER BY cl.lang)
      FROM public.candidate_languages cl
      WHERE cl.candidate_id = u.id
    ),
    (
      SELECT jsonb_agg(jsonb_build_object('code', l.code, 'level', NULL) ORDER BY l.code)
      FROM (SELECT DISTINCT lower(x) AS code FROM unnest(cr.languages) AS x) l
      WHERE l.code ~ '^[a-z]{2}$'
    ),
    '[]'::jsonb
  )
FROM public.users u
LEFT JOIN public.candidate_profiles cp ON cp.user_id = u.id
LEFT JOIN public.creator_profiles cr ON cr.user_id = u.id
LEFT JOIN public.employer_profiles ep ON ep.user_id = u.id
WHERE u.status <> 'deleted'
  AND (cp.user_id IS NOT NULL OR cr.user_id IS NOT NULL OR ep.user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;
