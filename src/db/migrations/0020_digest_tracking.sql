-- Migration 0020: when the last match digest went out (9B, D185-D189).
-- app_rw already has table-level SELECT/UPDATE on candidate_profiles (0001).

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS last_digest_at timestamptz;

COMMENT ON COLUMN public.candidate_profiles.last_digest_at IS
  'When the last matches.digest went out; claims the daily slot (9B, D187).';
