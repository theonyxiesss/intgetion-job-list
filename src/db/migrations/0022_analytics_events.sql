-- Migration 0022: own analytics events (D225-D227). No IP, no user id, no
-- full user agent: a daily visitor key for everyone and, only with analytics
-- consent, the random id of the _ia cookie.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  path text NOT NULL,
  locale text,
  job_id uuid,
  search_term text,
  search_filters text[],
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text NOT NULL,
  day_visitor text NOT NULL,
  visitor_id uuid,
  CONSTRAINT analytics_events_name_check
    CHECK (name IN ('page_view', 'job_view', 'search', 'signup', 'apply')),
  CONSTRAINT analytics_events_device_check
    CHECK (device IN ('mobile', 'tablet', 'desktop'))
);

CREATE INDEX IF NOT EXISTS analytics_events_time_idx
  ON public.analytics_events (occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx
  ON public.analytics_events (visitor_id, occurred_at)
  WHERE visitor_id IS NOT NULL;

SELECT public.enable_rls_deny_all('public.analytics_events');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_events TO app_rw;
