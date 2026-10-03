CREATE TABLE IF NOT EXISTS public.fx_rates (
  currency char(3) NOT NULL,
  rate_to_usd numeric(18,8) NOT NULL CHECK (rate_to_usd > 0),
  as_of date NOT NULL,
  PRIMARY KEY(currency, as_of)
);
SELECT public.enable_rls_deny_all('public.fx_rates');
GRANT SELECT, INSERT, UPDATE ON public.fx_rates TO app_rw;

CREATE TABLE IF NOT EXISTS public.import_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('api','rss')),
  url text,
  enabled boolean NOT NULL DEFAULT false,
  republish_allowed boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  last_status text
);
CREATE TABLE IF NOT EXISTS public.job_sources (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  import_source_id uuid NOT NULL REFERENCES public.import_sources(id) ON DELETE RESTRICT,
  external_id text NOT NULL,
  source_url text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(import_source_id, external_id)
);
SELECT public.enable_rls_deny_all('public.import_sources');
SELECT public.enable_rls_deny_all('public.job_sources');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_sources, public.job_sources TO app_rw;

CREATE INDEX IF NOT EXISTS jobs_published_cursor_idx
  ON public.jobs (published_at DESC, id DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS jobs_published_category_idx
  ON public.jobs (category, published_at DESC, id DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS jobs_published_format_idx
  ON public.jobs (work_format, published_at DESC, id DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS jobs_published_employment_idx
  ON public.jobs (employment_type, published_at DESC, id DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS jobs_published_source_idx
  ON public.jobs (source, published_at DESC, id DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS jobs_published_country_idx
  ON public.jobs (location_country, published_at DESC, id DESC)
  WHERE status = 'published';
