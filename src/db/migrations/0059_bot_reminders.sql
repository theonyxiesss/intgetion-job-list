-- D473: reminders Spoki sets on request ("remind me of the interview on
-- Thursday at 15:00"). The telegram cron sends each one once to the
-- person's linked Telegram. Sent, failed and cancelled rows are erased by
-- the retention cron after 30 days.

CREATE TABLE IF NOT EXISTS public.bot_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  remind_at timestamptz NOT NULL,
  time_zone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bot_reminders_text_check CHECK (
    char_length(text) BETWEEN 1 AND 200
  ),
  CONSTRAINT bot_reminders_status_check CHECK (
    status IN ('pending', 'sent', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS bot_reminders_user_idx
  ON public.bot_reminders (user_id, remind_at);

CREATE INDEX IF NOT EXISTS bot_reminders_due_idx
  ON public.bot_reminders (remind_at)
  WHERE status = 'pending';

SELECT public.enable_rls_deny_all('public.bot_reminders');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_reminders TO app_rw;
