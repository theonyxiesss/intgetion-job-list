-- D369: the admin log splits checked people into candidates and employers.
-- `checked` stays the total; candidates = checked - checked_employers.

ALTER TABLE public.brief_runs
  ADD COLUMN IF NOT EXISTS checked_employers integer NOT NULL DEFAULT 0;
