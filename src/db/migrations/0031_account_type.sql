-- D331: what the person said at registration — looking for work or hiring.
-- A soft type: it picks the landing page and the menu, never permissions
-- (those stay with company membership, D13). Everyone before it is a candidate.

DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('candidate', 'employer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_type public.account_type NOT NULL DEFAULT 'candidate';
