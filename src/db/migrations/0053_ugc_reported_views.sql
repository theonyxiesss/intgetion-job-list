-- Phase B (D458): a live post link and a view count the creator reported.
-- The app does not fetch the page. Existing rows stay unset.

ALTER TABLE public.ugc_submissions
  ADD COLUMN IF NOT EXISTS live_url text,
  ADD COLUMN IF NOT EXISTS reported_views integer,
  ADD COLUMN IF NOT EXISTS reported_at timestamptz;

ALTER TABLE public.ugc_submissions
  DROP CONSTRAINT IF EXISTS ugc_submissions_live_url_len;
ALTER TABLE public.ugc_submissions
  ADD CONSTRAINT ugc_submissions_live_url_len CHECK (
    live_url IS NULL OR char_length(live_url) <= 500
  );

ALTER TABLE public.ugc_submissions
  DROP CONSTRAINT IF EXISTS ugc_submissions_reported_views_check;
ALTER TABLE public.ugc_submissions
  ADD CONSTRAINT ugc_submissions_reported_views_check CHECK (
    reported_views IS NULL OR reported_views BETWEEN 0 AND 2000000000
  );

ALTER TABLE public.ugc_submissions
  DROP CONSTRAINT IF EXISTS ugc_submissions_report_pair;
ALTER TABLE public.ugc_submissions
  ADD CONSTRAINT ugc_submissions_report_pair CHECK (
    (live_url IS NULL AND reported_views IS NULL AND reported_at IS NULL)
    OR (live_url IS NOT NULL AND reported_views IS NOT NULL AND reported_at IS NOT NULL)
  );
