-- D521: the journal of what Spoki did for a person. One row per write the
-- person asked for: a confirmation card (awaiting → executing → completed,
-- failed, cancelled, expired or interrupted) or a direct write (completed or
-- failed). No arguments, texts, contacts or addresses: the tool, a hash of
-- the arguments, a link to the business item and a safe error code. One card
-- is one row (unique confirmation_id). Kept BOT_ACTIONS_RETENTION_DAYS (180
-- by default) by the retention cron; part of the data export; deleted with
-- the account.
CREATE TABLE IF NOT EXISTS public.bot_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.bot_conversations(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'web',
  tool text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL,
  confirmation_id uuid UNIQUE,
  args_hash text,
  entity_type text,
  entity_id text,
  error_code text,
  confirmed_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bot_actions_channel_check CHECK (channel IN ('web', 'telegram')),
  CONSTRAINT bot_actions_kind_check CHECK (kind IN ('card', 'direct')),
  CONSTRAINT bot_actions_status_check CHECK (
    status IN ('awaiting_confirmation', 'executing', 'completed', 'failed',
               'cancelled', 'expired', 'interrupted')
  ),
  CONSTRAINT bot_actions_tool_check CHECK (char_length(tool) BETWEEN 1 AND 64),
  CONSTRAINT bot_actions_entity_check CHECK (
    (entity_type IS NULL) = (entity_id IS NULL)
    AND (entity_id IS NULL OR char_length(entity_id) <= 64)
  ),
  CONSTRAINT bot_actions_error_check CHECK (
    error_code IS NULL OR error_code ~ '^[A-Z0-9_]{1,64}$'
  ),
  CONSTRAINT bot_actions_card_check CHECK (
    (kind = 'card') = (confirmation_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS bot_actions_user_idx
  ON public.bot_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bot_actions_open_idx
  ON public.bot_actions (status, created_at)
  WHERE status IN ('awaiting_confirmation', 'executing');

SELECT public.enable_rls_deny_all('public.bot_actions');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_actions TO app_rw;
