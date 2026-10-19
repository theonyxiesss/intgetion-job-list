-- D494: editable job draft shared by Spoki, the Telegram bot and hire form.
CREATE TABLE IF NOT EXISTS public.job_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitting', 'submitted')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_drafts_object_check CHECK (jsonb_typeof(draft) = 'object')
);

CREATE INDEX IF NOT EXISTS job_drafts_user_updated_idx
  ON public.job_drafts (user_id, updated_at DESC);

SELECT public.enable_rls_deny_all('public.job_drafts');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_drafts TO app_rw;
