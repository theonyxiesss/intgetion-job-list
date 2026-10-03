-- Migration 0005: candidate profile, skills, experience, languages,
-- preferences, and contacts (subphase 2B).
-- citext follows D40: create it only when it is still missing.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE SCHEMA extensions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'citext') THEN
    CREATE EXTENSION citext WITH SCHEMA extensions;
  END IF;
  IF NOT has_schema_privilege('app_rw', 'extensions', 'USAGE') THEN
    GRANT USAGE ON SCHEMA extensions TO app_rw;
  END IF;
END
$$;

CREATE TABLE public.candidate_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  full_name text,
  headline text,
  desired_titles text[] NOT NULL DEFAULT '{}',
  country char(2),
  city text,
  timezone text NOT NULL,
  work_hours_start time NOT NULL DEFAULT '09:00',
  work_hours_end time NOT NULL DEFAULT '18:00',
  work_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  work_formats work_format[] NOT NULL DEFAULT '{remote}',
  employment_types employment_type[] NOT NULL DEFAULT '{full_time}',
  experience_years smallint,
  availability_date date,
  salary_min bigint,
  salary_max bigint,
  salary_currency char(3),
  salary_period salary_period,
  salary_basis salary_basis,
  min_overlap_hours smallint NOT NULL DEFAULT 3,
  summary text,
  is_hidden boolean NOT NULL DEFAULT false,
  completeness smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_profiles_full_name_check
    CHECK (full_name IS NULL OR char_length(full_name) BETWEEN 1 AND 120),
  CONSTRAINT candidate_profiles_headline_check
    CHECK (headline IS NULL OR char_length(headline) BETWEEN 1 AND 160),
  CONSTRAINT candidate_profiles_desired_titles_check
    CHECK (
      cardinality(desired_titles) <= 5
      AND NOT EXISTS (
        SELECT 1 FROM unnest(desired_titles) AS title
        WHERE char_length(title) < 1 OR char_length(title) > 80
      )
    ),
  CONSTRAINT candidate_profiles_country_check
    CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  CONSTRAINT candidate_profiles_city_check
    CHECK (city IS NULL OR char_length(city) BETWEEN 1 AND 80),
  CONSTRAINT candidate_profiles_work_days_check
    CHECK (
      cardinality(work_days) <= 7
      AND work_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
    ),
  CONSTRAINT candidate_profiles_experience_years_check
    CHECK (experience_years IS NULL OR experience_years BETWEEN 0 AND 60),
  CONSTRAINT candidate_profiles_min_overlap_check
    CHECK (min_overlap_hours BETWEEN 0 AND 12),
  CONSTRAINT candidate_profiles_summary_check
    CHECK (summary IS NULL OR char_length(summary) <= 2000),
  CONSTRAINT candidate_profiles_completeness_check
    CHECK (completeness BETWEEN 0 AND 100),
  CONSTRAINT candidate_profiles_salary_order_check
    CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
  CONSTRAINT candidate_profiles_salary_parts_check
    CHECK (
      (salary_min IS NULL AND salary_max IS NULL)
      OR (
        salary_currency IS NOT NULL
        AND salary_period IS NOT NULL
        AND salary_basis IS NOT NULL
      )
    )
);

CREATE TRIGGER candidate_profiles_set_updated_at
BEFORE UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.candidate_skills (
  candidate_id uuid NOT NULL
    REFERENCES public.candidate_profiles (user_id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills (id) ON DELETE CASCADE,
  level skill_level NOT NULL,
  years smallint,
  PRIMARY KEY (candidate_id, skill_id),
  CONSTRAINT candidate_skills_years_check
    CHECK (years IS NULL OR years BETWEEN 0 AND 60)
);

CREATE INDEX candidate_skills_skill_id_idx ON public.candidate_skills (skill_id);

CREATE TABLE public.candidate_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL
    REFERENCES public.candidate_profiles (user_id) ON DELETE CASCADE,
  company_name text NOT NULL,
  title text NOT NULL,
  start_month date NOT NULL,
  end_month date,
  description text,
  sort smallint NOT NULL DEFAULT 0,
  CONSTRAINT candidate_experience_company_name_check
    CHECK (char_length(company_name) BETWEEN 1 AND 160),
  CONSTRAINT candidate_experience_title_check
    CHECK (char_length(title) BETWEEN 1 AND 160),
  CONSTRAINT candidate_experience_description_check
    CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT candidate_experience_months_check
    CHECK (end_month IS NULL OR end_month >= start_month)
);

CREATE INDEX candidate_experience_candidate_id_idx
  ON public.candidate_experience (candidate_id);

CREATE TABLE public.candidate_languages (
  candidate_id uuid NOT NULL
    REFERENCES public.candidate_profiles (user_id) ON DELETE CASCADE,
  lang char(2) NOT NULL,
  level cefr_level NOT NULL,
  PRIMARY KEY (candidate_id, lang),
  CONSTRAINT candidate_languages_lang_check CHECK (lang ~ '^[a-z]{2}$')
);

CREATE TABLE public.candidate_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  categories text[] NOT NULL DEFAULT '{}',
  company_sizes company_size[] NOT NULL DEFAULT '{}',
  notes text,
  CONSTRAINT candidate_preferences_categories_check
    CHECK (
      categories <@ ARRAY[
        'engineering', 'data', 'design', 'product', 'marketing',
        'sales', 'support', 'operations', 'finance', 'hr'
      ]::text[]
    ),
  CONSTRAINT candidate_preferences_notes_check
    CHECK (notes IS NULL OR char_length(notes) <= 500)
);

CREATE TABLE public.candidate_contacts (
  candidate_id uuid PRIMARY KEY
    REFERENCES public.candidate_profiles (user_id) ON DELETE CASCADE,
  email extensions.citext NOT NULL,
  phone text,
  telegram text,
  linkedin_url text,
  website_url text,
  extra jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_contacts_phone_check
    CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{6,14}$'),
  CONSTRAINT candidate_contacts_telegram_check
    CHECK (
      telegram IS NULL
      OR telegram ~ '^[A-Za-z][A-Za-z0-9_]{4,31}$'
    ),
  CONSTRAINT candidate_contacts_linkedin_check
    CHECK (
      linkedin_url IS NULL
      OR (char_length(linkedin_url) <= 300 AND linkedin_url ~ '^https?://')
    ),
  CONSTRAINT candidate_contacts_website_check
    CHECK (
      website_url IS NULL
      OR (char_length(website_url) <= 300 AND website_url ~ '^https?://')
    )
);

CREATE TRIGGER candidate_contacts_set_updated_at
BEFORE UPDATE ON public.candidate_contacts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

SELECT public.enable_rls_deny_all('public.candidate_profiles');
SELECT public.enable_rls_deny_all('public.candidate_skills');
SELECT public.enable_rls_deny_all('public.candidate_experience');
SELECT public.enable_rls_deny_all('public.candidate_languages');
SELECT public.enable_rls_deny_all('public.candidate_preferences');
SELECT public.enable_rls_deny_all('public.candidate_contacts');
