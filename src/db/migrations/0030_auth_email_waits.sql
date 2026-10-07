-- D328: PC waits for an email link opened on another device.

CREATE TABLE IF NOT EXISTS public.auth_email_waits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wait_hash text NOT NULL UNIQUE,
  purpose text NOT NULL,
  locale text NOT NULL,
  handoff_token_hash text,
  ready_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_email_waits_purpose_check CHECK (purpose IN ('login', 'signup')),
  CONSTRAINT auth_email_waits_locale_check CHECK (locale IN ('en', 'ru'))
);

CREATE INDEX IF NOT EXISTS auth_email_waits_expires_idx
  ON public.auth_email_waits (expires_at);

SELECT public.enable_rls_deny_all('public.auth_email_waits');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_email_waits TO app_rw;
