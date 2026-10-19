-- D493: editable freelance service draft shared by Spoki and the listing form.
CREATE TABLE IF NOT EXISTS public.freelance_service_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_service_drafts_object_check CHECK (jsonb_typeof(draft) = 'object')
);

CREATE INDEX IF NOT EXISTS freelance_service_drafts_updated_idx
  ON public.freelance_service_drafts (user_id, updated_at DESC);

SELECT public.enable_rls_deny_all('public.freelance_service_drafts');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_service_drafts TO app_rw;
