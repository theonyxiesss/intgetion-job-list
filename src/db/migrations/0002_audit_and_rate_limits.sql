-- Migration 0002: audit_logs and rate_limit_counters (subphase 1B, D26).

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  diff jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_id, created_at);

SELECT public.enable_rls_deny_all('public.audit_logs');
-- Append-only for the app: rows are written and read, never edited.
-- DELETE stays for the retention cron (section 17).
REVOKE UPDATE ON TABLE public.audit_logs FROM app_rw;

CREATE TABLE public.rate_limit_counters (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX rate_limit_counters_window_idx
  ON public.rate_limit_counters (window_start);

SELECT public.enable_rls_deny_all('public.rate_limit_counters');
