-- U4 (TZ 48 s.8): the room shows when the company answered the video, and
-- each party sees how many messages came since it last opened the room.
-- Additive: one column on submissions and one table of read marks per party.
ALTER TABLE public.ugc_submissions
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;

CREATE TABLE IF NOT EXISTS public.ugc_room_reads (
  invite_id uuid NOT NULL REFERENCES public.ugc_invites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, user_id)
);

SELECT public.enable_rls_deny_all('public.ugc_room_reads');
GRANT SELECT, INSERT, UPDATE ON public.ugc_room_reads TO app_rw;
