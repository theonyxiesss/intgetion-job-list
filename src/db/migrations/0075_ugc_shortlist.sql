-- U3b (TZ 48 s.6): the company's shortlist mark on an application. Additive,
-- default false. Only the company's members read or set it; the creator never sees it.
ALTER TABLE public.ugc_invites
  ADD COLUMN IF NOT EXISTS shortlisted boolean NOT NULL DEFAULT false;
