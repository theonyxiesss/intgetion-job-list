-- A2: ban status, blocklist, append-only notes, four-eyes requests (D293–D297).

ALTER TYPE public.user_status ADD VALUE IF NOT EXISTS 'banned';

CREATE TABLE IF NOT EXISTS public.blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('email', 'telegram')),
  value_hash text NOT NULL,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_by uuid REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, value_hash)
);

CREATE INDEX IF NOT EXISTS blocklist_user_idx ON public.blocklist (user_id);

CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('user', 'company')),
  entity_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  author_id uuid NOT NULL REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notes_entity_idx
  ON public.admin_notes (entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS public.admin_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('users.ban', 'users.delete')),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  requested_by uuid NOT NULL REFERENCES public.users (id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  decided_by uuid REFERENCES public.users (id),
  decided_at timestamptz,
  decision text CHECK (decision IS NULL OR decision IN ('approved', 'rejected')),
  CHECK (
    (decided_at IS NULL AND decided_by IS NULL AND decision IS NULL)
    OR (decided_at IS NOT NULL AND decided_by IS NOT NULL AND decision IS NOT NULL)
  ),
  CHECK (decided_by IS NULL OR decided_by <> requested_by)
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_approvals_open_idx
  ON public.admin_approvals (action, entity_id)
  WHERE decided_at IS NULL;

SELECT public.enable_rls_deny_all('public.blocklist');
SELECT public.enable_rls_deny_all('public.admin_notes');
SELECT public.enable_rls_deny_all('public.admin_approvals');

GRANT SELECT, INSERT ON public.blocklist TO app_rw;
GRANT SELECT, INSERT ON public.admin_notes TO app_rw;
GRANT SELECT, INSERT, UPDATE ON public.admin_approvals TO app_rw;
