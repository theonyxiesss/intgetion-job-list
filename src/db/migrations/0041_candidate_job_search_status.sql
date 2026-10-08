-- Whether a candidate is looking for work (docs/tz/20-morning-briefs.md §10.4).
-- Existing candidates stay `active`; employer briefs skip `not_looking`.

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS job_search_status text NOT NULL DEFAULT 'active'
    CHECK (job_search_status IN ('active', 'passive', 'not_looking'));
