-- 6B: recompute queue for jobs that became published (10.1, D161).
-- Replaces pg-boss (D25) for the MVP, like the 9A email queue (D125):
-- one row per job, claimed by /api/cron/matching with FOR UPDATE SKIP LOCKED.

CREATE TABLE IF NOT EXISTS public.matching_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  considered integer,
  written integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pending', 'running', 'done', 'failed')),
  CHECK (attempts BETWEEN 0 AND 5)
);

-- A second publish of the same job while one task waits adds nothing.
CREATE UNIQUE INDEX IF NOT EXISTS matching_jobs_pending_job_idx
  ON public.matching_jobs (job_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS matching_jobs_due_idx
  ON public.matching_jobs (status, run_after);

SELECT public.enable_rls_deny_all('public.matching_jobs');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matching_jobs TO app_rw;
