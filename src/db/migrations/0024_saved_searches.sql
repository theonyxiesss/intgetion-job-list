-- Migration 0024: saved catalog searches with daily alerts (D233-D235).

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  query text NOT NULL,
  alert boolean NOT NULL DEFAULT true,
  last_alert_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_searches_name_check CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT saved_searches_query_check CHECK (char_length(query) BETWEEN 1 AND 1000),
  CONSTRAINT saved_searches_unique UNIQUE (user_id, query)
);

CREATE INDEX IF NOT EXISTS saved_searches_alert_idx
  ON public.saved_searches (last_alert_at) WHERE alert;

SELECT public.enable_rls_deny_all('public.saved_searches');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO app_rw;
