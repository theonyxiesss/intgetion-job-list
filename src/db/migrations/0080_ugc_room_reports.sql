-- U4b (TZ 48 s.8, D574): a party's complaint about a message in an order room.
-- A moderator hides the message or dismisses the complaint. One complaint per
-- person per message.
CREATE TABLE IF NOT EXISTS public.ugc_room_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.ugc_room_messages(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  decided_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_room_reports_reason_check
    CHECK (reason IN ('spam', 'abuse', 'contacts', 'other')),
  CONSTRAINT ugc_room_reports_status_check
    CHECK (status IN ('open', 'hidden', 'dismissed')),
  CONSTRAINT ugc_room_reports_unique UNIQUE (message_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS ugc_room_reports_status_idx
  ON public.ugc_room_reports (status, created_at);

SELECT public.enable_rls_deny_all('public.ugc_room_reports');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_room_reports TO app_rw;
