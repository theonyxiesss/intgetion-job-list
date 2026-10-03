-- 3B: internal employer job management. Enums are defined in migration 0001.

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 140),
  description text NOT NULL CHECK (length(description) BETWEEN 50 AND 20000),
  category text NOT NULL,
  work_format public.work_format NOT NULL DEFAULT 'remote',
  employment_type public.employment_type NOT NULL,
  experience_min smallint,
  experience_max smallint,
  location text,
  location_country char(2),
  country_restrictions char(2)[],
  timezone_required text,
  work_hours_start time,
  work_hours_end time,
  min_overlap_hours smallint NOT NULL DEFAULT 3 CHECK (min_overlap_hours BETWEEN 0 AND 12),
  salary_min bigint,
  salary_max bigint,
  salary_currency char(3),
  salary_period public.salary_period,
  salary_basis public.salary_basis,
  application_method public.application_method NOT NULL,
  application_url text,
  application_email text,
  source public.job_source NOT NULL DEFAULT 'internal',
  status public.job_status NOT NULL DEFAULT 'draft',
  risk_score smallint NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 10),
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  imported_at timestamptz,
  fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (category IN ('engineering', 'data', 'design', 'product', 'marketing', 'sales', 'support', 'operations', 'finance', 'hr')),
  CHECK (experience_min IS NULL OR experience_min BETWEEN 0 AND 60),
  CHECK (experience_max IS NULL OR experience_max BETWEEN 0 AND 60),
  CHECK (experience_min IS NULL OR experience_max IS NULL OR experience_min <= experience_max),
  CHECK (salary_min IS NULL OR salary_min >= 0),
  CHECK (salary_max IS NULL OR salary_max >= 0),
  CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
  CHECK ((salary_min IS NULL AND salary_max IS NULL) OR (salary_currency IS NOT NULL AND salary_period IS NOT NULL AND salary_basis IS NOT NULL)),
  CHECK (source <> 'internal' OR application_method <> 'external_url' OR application_url IS NOT NULL),
  CHECK (source <> 'internal' OR application_method <> 'email' OR application_email IS NOT NULL),
  CHECK (application_email IS NULL OR application_email = lower(application_email)),
  CHECK (work_format = 'remote' OR location IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS jobs_company_status_idx ON public.jobs(company_id, status);
CREATE INDEX IF NOT EXISTS jobs_status_expiry_idx ON public.jobs(status, expires_at);
CREATE INDEX IF NOT EXISTS jobs_fts_idx ON public.jobs USING gin(fts);
CREATE INDEX IF NOT EXISTS jobs_title_trgm_idx ON public.jobs USING gin(title extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS jobs_country_restrictions_idx ON public.jobs USING gin(country_restrictions);
DROP TRIGGER IF EXISTS jobs_set_updated_at ON public.jobs;
CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
SELECT public.enable_rls_deny_all('public.jobs');

CREATE TABLE IF NOT EXISTS public.job_skills (
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
  weight smallint NOT NULL CHECK (weight BETWEEN 1 AND 3),
  min_level public.skill_level,
  PRIMARY KEY (job_id, skill_id)
);
CREATE INDEX IF NOT EXISTS job_skills_skill_job_idx ON public.job_skills(skill_id, job_id);
SELECT public.enable_rls_deny_all('public.job_skills');

CREATE TABLE IF NOT EXISTS public.job_languages (
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  lang char(2) NOT NULL,
  min_level public.cefr_level NOT NULL,
  PRIMARY KEY (job_id, lang)
);
SELECT public.enable_rls_deny_all('public.job_languages');

CREATE TABLE IF NOT EXISTS public.job_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  from_status public.job_status,
  to_status public.job_status NOT NULL,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason text CHECK (reason IS NULL OR length(reason) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_status_history_job_created_idx ON public.job_status_history(job_id, created_at DESC);
SELECT public.enable_rls_deny_all('public.job_status_history');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs, public.job_skills, public.job_languages, public.job_status_history TO app_rw;
