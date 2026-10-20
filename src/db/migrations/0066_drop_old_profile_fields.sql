-- D509, step 3 of 3 (founder's yes, 2026-10-21): the old copies of the
-- shared profile are dropped. Name, place and languages live in
-- user_profiles (0064); the creator keeps display_name as a nickname; the
-- employer keeps title and linkedin_url. Applied after the code that no
-- longer reads or writes these columns is live.
ALTER TABLE public.candidate_profiles
  DROP COLUMN IF EXISTS full_name,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS timezone;

DROP TABLE IF EXISTS public.candidate_languages;

ALTER TABLE public.creator_profiles
  DROP COLUMN IF EXISTS languages,
  DROP COLUMN IF EXISTS country;

ALTER TABLE public.employer_profiles DROP COLUMN IF EXISTS full_name;

ALTER TABLE public.users DROP COLUMN IF EXISTS account_type;
DROP TYPE IF EXISTS public.account_type;
