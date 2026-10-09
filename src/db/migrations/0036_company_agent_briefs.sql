-- D368: morning briefs for employers (subphase C). Off until an owner or admin turns it on.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS agent_briefs_enabled boolean NOT NULL DEFAULT false;
