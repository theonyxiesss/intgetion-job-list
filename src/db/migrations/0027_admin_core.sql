-- Migration 0027: admin host session, roles, recovery codes, passkeys (D250–D254).

CREATE TABLE IF NOT EXISTS public.admin_members (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (
    role IN ('owner', 'admin', 'moderator', 'support', 'analyst', 'marketing')
  ),
  mfa_enrolled_at timestamptz,
  disabled_at timestamptz,
  created_by uuid REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_class text NOT NULL,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_step_up_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS admin_sessions_user_idx
  ON public.admin_sessions (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.admin_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_recovery_codes_user_idx
  ON public.admin_recovery_codes (user_id);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS device_class text;

SELECT public.enable_rls_deny_all('public.admin_members');
SELECT public.enable_rls_deny_all('public.admin_sessions');
SELECT public.enable_rls_deny_all('public.admin_recovery_codes');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_members TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_sessions TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_recovery_codes TO app_rw;
