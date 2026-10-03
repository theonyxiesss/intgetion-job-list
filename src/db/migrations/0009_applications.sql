-- 5A: candidate applications. Enums are defined in migration 0001.
-- 0007 and 0008 belong to other subphases and are not in this branch (D109).

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cover_note text,
  status public.application_status NOT NULL DEFAULT 'applied',
  reapply_count smallint NOT NULL DEFAULT 0,
  viewed_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cover_note IS NULL OR char_length(cover_note) BETWEEN 1 AND 2000),
  CHECK (reapply_count BETWEEN 0 AND 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS applications_active_pair_idx
  ON public.applications (job_id, candidate_id)
  WHERE status <> 'withdrawn';

CREATE INDEX IF NOT EXISTS applications_candidate_created_idx
  ON public.applications (candidate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS applications_job_status_created_idx
  ON public.applications (job_id, status, created_at DESC);

DROP TRIGGER IF EXISTS applications_set_updated_at ON public.applications;
CREATE TRIGGER applications_set_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

SELECT public.enable_rls_deny_all('public.applications');

CREATE TABLE IF NOT EXISTS public.application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_status public.application_status,
  to_status public.application_status NOT NULL,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_status_history_application_idx
  ON public.application_status_history (application_id, created_at);

SELECT public.enable_rls_deny_all('public.application_status_history');

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.applications, public.application_status_history
  TO app_rw;
