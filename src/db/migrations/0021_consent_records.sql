-- Migration 0021: proof of cookie consent (D220). A signed-in user's latest
-- row is also the starting choice on a new device.

-- Every choice made in the banner or in settings, kept 3 years (GDPR art. 7).
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  choice text NOT NULL,
  policy_version text NOT NULL,
  gpc boolean NOT NULL DEFAULT false,
  source text NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_records_source_check CHECK (source IN ('banner', 'settings'))
);

CREATE INDEX IF NOT EXISTS consent_records_user_idx
  ON public.consent_records (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS consent_records_created_idx
  ON public.consent_records (created_at);

SELECT public.enable_rls_deny_all('public.consent_records');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_records TO app_rw;
