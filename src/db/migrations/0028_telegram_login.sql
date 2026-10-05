-- D256: one-time Telegram bot sign-in. The raw code lives only in an
-- httpOnly cookie; this table stores its hash.
-- Idempotent (D259): the cloud database already has this table from a
-- manual 0020_telegram_login.sql. That bookkeeping row is not this file.

CREATE TABLE IF NOT EXISTS public.telegram_login_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  locale text NOT NULL,
  expires_at timestamptz NOT NULL,
  telegram_id text,
  username text,
  first_name text,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_login_challenges_locale_check CHECK (locale IN ('en', 'ru'))
);

CREATE INDEX IF NOT EXISTS telegram_login_challenges_expires_idx
  ON public.telegram_login_challenges (expires_at);

SELECT public.enable_rls_deny_all('public.telegram_login_challenges');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_login_challenges TO app_rw;
