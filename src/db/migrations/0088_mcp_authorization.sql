-- D485 / MCP phase 2: user consent, OAuth grants and opaque tokens.

CREATE TABLE IF NOT EXISTS public.mcp_clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  redirect_uris jsonb NOT NULL,
  metadata jsonb NOT NULL,
  active text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mcp_clients_active_check CHECK (active IN ('active', 'revoked')),
  CONSTRAINT mcp_clients_redirect_uris_array_check CHECK (jsonb_typeof(redirect_uris) = 'array'),
  CONSTRAINT mcp_clients_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.mcp_authorization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES public.mcp_clients(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  scopes jsonb NOT NULL,
  state text,
  code_challenge text NOT NULL,
  resource text NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mcp_authorization_requests_scopes_array_check CHECK (jsonb_typeof(scopes) = 'array')
);
CREATE INDEX IF NOT EXISTS mcp_authorization_requests_expires_idx
  ON public.mcp_authorization_requests (expires_at);

CREATE TABLE IF NOT EXISTS public.mcp_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id text NOT NULL REFERENCES public.mcp_clients(id) ON DELETE CASCADE,
  scopes jsonb NOT NULL,
  resource text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT mcp_grants_scopes_array_check CHECK (jsonb_typeof(scopes) = 'array')
);
CREATE INDEX IF NOT EXISTS mcp_grants_user_idx
  ON public.mcp_grants (user_id, revoked_at);
CREATE UNIQUE INDEX IF NOT EXISTS mcp_grants_active_user_client_idx
  ON public.mcp_grants (user_id, client_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.mcp_authorization_codes (
  code_hash text PRIMARY KEY,
  grant_id uuid NOT NULL REFERENCES public.mcp_grants(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  resource text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mcp_authorization_codes_expires_idx
  ON public.mcp_authorization_codes (expires_at);

CREATE TABLE IF NOT EXISTS public.mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL REFERENCES public.mcp_grants(id) ON DELETE CASCADE,
  access_token_hash text NOT NULL UNIQUE,
  refresh_token_hash text NOT NULL UNIQUE,
  access_expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  replaced_by_id uuid REFERENCES public.mcp_tokens(id),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mcp_tokens_grant_idx
  ON public.mcp_tokens (grant_id, revoked_at);

CREATE TABLE IF NOT EXISTS public.mcp_personal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scopes jsonb NOT NULL,
  resource text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT mcp_personal_tokens_label_check CHECK (char_length(label) BETWEEN 1 AND 80),
  CONSTRAINT mcp_personal_tokens_scopes_array_check CHECK (jsonb_typeof(scopes) = 'array')
);
CREATE INDEX IF NOT EXISTS mcp_personal_tokens_user_idx
  ON public.mcp_personal_tokens (user_id, revoked_at);

ALTER TABLE public.bot_conversations
  DROP CONSTRAINT IF EXISTS bot_conversations_channel_check;
ALTER TABLE public.bot_conversations
  ADD CONSTRAINT bot_conversations_channel_check CHECK (channel IN ('web', 'mcp'));

SELECT public.enable_rls_deny_all('public.mcp_clients');
SELECT public.enable_rls_deny_all('public.mcp_authorization_requests');
SELECT public.enable_rls_deny_all('public.mcp_grants');
SELECT public.enable_rls_deny_all('public.mcp_authorization_codes');
SELECT public.enable_rls_deny_all('public.mcp_tokens');
SELECT public.enable_rls_deny_all('public.mcp_personal_tokens');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_clients TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_authorization_requests TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_grants TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_authorization_codes TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_tokens TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_personal_tokens TO app_rw;
