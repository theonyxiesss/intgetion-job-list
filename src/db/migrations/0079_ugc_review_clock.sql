-- U4b (TZ 48 s.10, D574): when a video was sent for review, which reminder
-- the company has had, and whether support was told. Additive. Videos already
-- waiting for a decision start their clock at their last change.
ALTER TABLE public.ugc_submissions
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_stage smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD CONSTRAINT ugc_submissions_review_stage_check CHECK (review_stage BETWEEN 0 AND 3);

UPDATE public.ugc_submissions
SET submitted_at = updated_at
WHERE status = 'submitted' AND submitted_at IS NULL;
