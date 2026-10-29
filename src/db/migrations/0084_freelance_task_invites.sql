-- A4 of TZ 44 (TZ 49): a client invites a freelancer to answer a task. One
-- invitation per freelancer per task. The invitation promises nothing: the
-- freelancer still sends a proposal and the client still chooses.
CREATE TABLE IF NOT EXISTS public.freelance_task_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.freelance_tasks(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_task_invites_task_seller_key UNIQUE (task_id, seller_id)
);

CREATE INDEX IF NOT EXISTS freelance_task_invites_seller_idx
  ON public.freelance_task_invites (seller_id, created_at DESC);

SELECT public.enable_rls_deny_all('public.freelance_task_invites');
GRANT SELECT, INSERT ON public.freelance_task_invites TO app_rw;
