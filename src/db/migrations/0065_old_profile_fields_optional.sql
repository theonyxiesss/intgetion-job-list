-- D509, step 1 of 3: the old copies of the shared profile stop being
-- required, so the code can stop writing them before 0066 drops them.
-- Nothing is deleted here.
ALTER TABLE public.candidate_profiles ALTER COLUMN timezone DROP NOT NULL;
ALTER TABLE public.creator_profiles ALTER COLUMN languages DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN account_type DROP NOT NULL;
