-- Migration 0023: Telegram accounts linked to users (D230). The link no
-- longer depends on the placeholder login email, so a Telegram user can add
-- a real email and an email user can link Telegram. Existing Telegram users
-- get their row on the next Telegram sign-in.

CREATE TABLE IF NOT EXISTS public.telegram_accounts (
  telegram_id bigint PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  username text,
  linked_at timestamptz NOT NULL DEFAULT now()
);

SELECT public.enable_rls_deny_all('public.telegram_accounts');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_accounts TO app_rw;
