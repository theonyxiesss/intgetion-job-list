-- Migration 0026: following companies (D239, D240).

CREATE TABLE IF NOT EXISTS public.company_follows (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  last_alert_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS company_follows_company_idx
  ON public.company_follows (company_id);

SELECT public.enable_rls_deny_all('public.company_follows');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_follows TO app_rw;
