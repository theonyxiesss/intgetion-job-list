-- U5 (TZ 48 s.9, D573): the video stays a link. Every link a creator sent is
-- kept as a version, the one the company accepted is marked, and the company
-- can say the link does not open. Additive; rows are only added or marked.
CREATE TABLE IF NOT EXISTS public.ugc_submission_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.ugc_submissions(id) ON DELETE CASCADE,
  version integer NOT NULL,
  url text NOT NULL,
  hook text NOT NULL DEFAULT '',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_submission_versions_key UNIQUE (submission_id, version),
  CONSTRAINT ugc_submission_versions_version_check CHECK (version >= 1)
);

SELECT public.enable_rls_deny_all('public.ugc_submission_versions');
GRANT SELECT, INSERT, UPDATE ON public.ugc_submission_versions TO app_rw;

ALTER TABLE public.ugc_submissions
  ADD COLUMN IF NOT EXISTS link_reported_at timestamptz;
