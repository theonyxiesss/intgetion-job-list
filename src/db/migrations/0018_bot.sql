-- 7A: bot conversations, messages and one-time confirmations (spec 4.1 BOT, 12, D170).
-- 0016 belongs to 6B and 0017 stays unused (10C needed no migration).

CREATE TABLE IF NOT EXISTS public.bot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'web',
  session_token_hash text NOT NULL UNIQUE,
  locale text,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bot_conversations_channel_check CHECK (channel IN ('web'))
);

CREATE INDEX IF NOT EXISTS bot_conversations_user_idx
  ON public.bot_conversations (user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS bot_conversations_guest_idx
  ON public.bot_conversations (last_message_at) WHERE user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.bot_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  tool_call jsonb,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  cost_micro_usd bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bot_messages_role_check
    CHECK (role IN ('user', 'assistant', 'tool', 'system_event')),
  CONSTRAINT bot_messages_usage_check
    CHECK (tokens_in >= 0 AND tokens_out >= 0 AND cost_micro_usd >= 0)
);

CREATE INDEX IF NOT EXISTS bot_messages_conversation_idx
  ON public.bot_messages (conversation_id, created_at);
-- Daily cost for the circuit breaker (12.5).
CREATE INDEX IF NOT EXISTS bot_messages_cost_idx
  ON public.bot_messages (created_at) WHERE cost_micro_usd > 0;

-- 12.3: a write tool runs only with a server-issued confirmation that is
-- bound to the user and the exact arguments, lives 10 minutes, used once.
CREATE TABLE IF NOT EXISTS public.bot_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.bot_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tool text NOT NULL,
  args jsonb NOT NULL,
  args_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  decided_at timestamptz,
  accepted boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_confirmations_conversation_idx
  ON public.bot_confirmations (conversation_id, created_at DESC);

SELECT public.enable_rls_deny_all('public.bot_conversations');
SELECT public.enable_rls_deny_all('public.bot_messages');
SELECT public.enable_rls_deny_all('public.bot_confirmations');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_conversations TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_messages TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_confirmations TO app_rw;
