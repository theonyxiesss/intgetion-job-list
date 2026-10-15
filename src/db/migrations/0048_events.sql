-- D413: events aggregator. Web3 and tech events (summits, conferences,
-- meetups, hackathons, business and career meetups) from official open data.
-- No registration on our side: the page links back to the organizer.
-- Events whose date has passed are deleted by the cron (D414).

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  -- IANA zone when the source gives a time; null for date-only sources.
  time_zone text,
  -- Date-only events are stored as whole UTC days and shown without a time.
  all_day boolean NOT NULL DEFAULT true,
  format text NOT NULL,
  -- ISO 3166-1 alpha-2, upper case.
  country text,
  city text,
  url text NOT NULL,
  cfp_url text,
  cfp_ends_at timestamptz,
  topics text[] NOT NULL DEFAULT '{}',
  kind text NOT NULL DEFAULT 'conference',
  source text NOT NULL,
  external_id text NOT NULL,
  status text NOT NULL DEFAULT 'published',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_slug_key UNIQUE (slug),
  CONSTRAINT events_source_external_key UNIQUE (source, external_id),
  CONSTRAINT events_dates_check CHECK (ends_at >= starts_at),
  CONSTRAINT events_format_check CHECK (format IN ('online', 'offline', 'hybrid')),
  CONSTRAINT events_kind_check CHECK (
    kind IN ('summit', 'conference', 'meetup', 'hackathon', 'business', 'career')
  ),
  CONSTRAINT events_status_check CHECK (status IN ('published', 'removed', 'expired')),
  CONSTRAINT events_country_check CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  CONSTRAINT events_url_check CHECK (url ~ '^https?://'),
  CONSTRAINT events_cfp_url_check CHECK (cfp_url IS NULL OR cfp_url ~ '^https?://')
);

CREATE INDEX IF NOT EXISTS events_status_starts_idx
  ON public.events (status, starts_at);
CREATE INDEX IF NOT EXISTS events_topics_idx
  ON public.events USING gin (topics);
CREATE INDEX IF NOT EXISTS events_source_seen_idx
  ON public.events (source, last_seen_at);

SELECT public.enable_rls_deny_all('public.events');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO app_rw;
