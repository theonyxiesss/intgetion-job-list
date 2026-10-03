-- 6A: cached matching v1 rows (spec 4.1 matching_results, D150).
-- pg-boss stays with 6B. Files run by name; 0015 is the next free number.

CREATE TABLE IF NOT EXISTS public.matching_results (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  score numeric(5,4) NOT NULL,
  breakdown jsonb NOT NULL,
  explain jsonb NOT NULL,
  algo_version smallint NOT NULL,
  computed_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, job_id),
  CONSTRAINT matching_results_score_check
    CHECK (score >= 0 AND score <= 1)
);

CREATE INDEX IF NOT EXISTS matching_results_user_score_idx
  ON public.matching_results (user_id, score DESC);

SELECT public.enable_rls_deny_all('public.matching_results');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matching_results TO app_rw;
