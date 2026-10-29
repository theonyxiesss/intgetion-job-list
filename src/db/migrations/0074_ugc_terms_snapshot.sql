-- U3 (TZ 48, D574): the terms an offer carries and the creator's agreement.
-- Additive and nullable: offers made before this migration have no snapshot
-- and are accepted as before. Table rights (deny-all RLS, app_rw) are unchanged.
ALTER TABLE public.ugc_invites
  ADD COLUMN IF NOT EXISTS terms jsonb,
  ADD COLUMN IF NOT EXISTS terms_hash text,
  ADD COLUMN IF NOT EXISTS agreed_hash text,
  ADD COLUMN IF NOT EXISTS agreed_at timestamptz;
