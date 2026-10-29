-- U4 (TZ 48 s.8, D574): messages in the room of one UGC participation.
-- Text stays 12 months after the order closed (retention sweep, later).
CREATE TABLE IF NOT EXISTS public.ugc_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.ugc_invites(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  hidden_at timestamptz,
  hidden_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_room_messages_body_check
    CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS ugc_room_messages_invite_idx
  ON public.ugc_room_messages (invite_id, created_at);

SELECT public.enable_rls_deny_all('public.ugc_room_messages');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_room_messages TO app_rw;
