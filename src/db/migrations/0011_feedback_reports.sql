CREATE TABLE IF NOT EXISTS public.saved_jobs (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.user_job_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  action feedback_action NOT NULL,
  reason text CHECK (reason IN ('salary','format','timezone','company','role','other')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_job_feedback_user_action_idx
  ON public.user_job_feedback (user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS user_job_feedback_user_job_idx
  ON public.user_job_feedback (user_id, job_id);
CREATE INDEX IF NOT EXISTS user_job_feedback_company_idx
  ON public.user_job_feedback (company_id, action, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('job','company','user')),
  entity_id uuid NOT NULL,
  reason report_reason NOT NULL,
  details text CHECK (char_length(details) <= 1000),
  status report_status NOT NULL DEFAULT 'open',
  decided_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS reports_status_created_idx
  ON public.reports (status, created_at DESC);

SELECT public.enable_rls_deny_all('public.saved_jobs');
SELECT public.enable_rls_deny_all('public.user_job_feedback');
SELECT public.enable_rls_deny_all('public.reports');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_jobs, public.user_job_feedback TO app_rw;
GRANT SELECT, INSERT, UPDATE ON public.reports TO app_rw;
