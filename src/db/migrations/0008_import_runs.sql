CREATE TABLE IF NOT EXISTS public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.import_sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  fetched integer NOT NULL DEFAULT 0 CHECK (fetched >= 0),
  created integer NOT NULL DEFAULT 0 CHECK (created >= 0),
  updated integer NOT NULL DEFAULT 0 CHECK (updated >= 0),
  merged integer NOT NULL DEFAULT 0 CHECK (merged >= 0),
  rejected integer NOT NULL DEFAULT 0 CHECK (rejected >= 0),
  expired integer NOT NULL DEFAULT 0 CHECK (expired >= 0),
  error text
);

CREATE INDEX IF NOT EXISTS import_runs_source_started_idx
  ON public.import_runs (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS import_runs_retention_idx
  ON public.import_runs (finished_at)
  WHERE finished_at IS NOT NULL;

SELECT public.enable_rls_deny_all('public.import_runs');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_runs TO app_rw;
