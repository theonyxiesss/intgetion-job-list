-- Migration 0020: Digest tracking for matches.digest
-- Adds last_digest_at to candidate_profiles and RLS

ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS last_digest_at timestamp with time zone;

COMMENT ON COLUMN public.candidate_profiles.last_digest_at IS 'When the last matches.digest was sent (9B)';

-- RLS policy for app_rw
GRANT SELECT, UPDATE (last_digest_at) ON public.candidate_profiles TO app_rw;