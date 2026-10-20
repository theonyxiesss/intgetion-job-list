-- D512 (founder's yes, 2026-10-21): a brief can be paused. While paused it
-- takes no new applications or hires; hired creators still hand in videos
-- and the company decides them. Additive: the check only gains 'paused'.
ALTER TABLE public.ugc_campaigns
  DROP CONSTRAINT IF EXISTS ugc_campaigns_status_check;

ALTER TABLE public.ugc_campaigns
  ADD CONSTRAINT ugc_campaigns_status_check CHECK (
    status IN ('draft', 'pending_review', 'open', 'paused', 'closed', 'rejected')
  );
