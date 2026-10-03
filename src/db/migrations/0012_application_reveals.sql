-- 5C: reveal row that opens contacts (D3). 0008, 0010 and 0011 belong to
-- other subphases and may be absent; migrations run in filename order (D124).

CREATE TABLE IF NOT EXISTS public.application_reveals (
  application_id uuid PRIMARY KEY REFERENCES public.applications(id) ON DELETE CASCADE,
  revealed_by uuid NOT NULL REFERENCES public.users(id),
  revealed_at timestamptz NOT NULL DEFAULT now(),
  via text NOT NULL CHECK (via = 'shortlisted')
);

SELECT public.enable_rls_deny_all('public.application_reveals');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_reveals TO app_rw;
