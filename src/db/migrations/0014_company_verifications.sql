-- 10B: company domain verification by corporate email or DNS TXT (4.1, 14.1).
-- Only the SHA-256 of the token is stored; the token itself is shown or
-- mailed once (D130).

CREATE TABLE IF NOT EXISTS public.company_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  method public.verification_method NOT NULL,
  target text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status public.verification_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_verifications_company_idx
  ON public.company_verifications (company_id, created_at DESC);

SELECT public.enable_rls_deny_all('public.company_verifications');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_verifications TO app_rw;
