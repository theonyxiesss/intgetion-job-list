-- D607: the visitor's country, two letters from the Vercel edge header.
-- No IP and no city are stored. Old rows stay without a country.

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_country_check;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_country_check
  CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');

-- The hourly new-visitor digest looks up each visitor's first event of the day.
CREATE INDEX IF NOT EXISTS analytics_events_day_visitor_idx
  ON public.analytics_events (day_visitor, occurred_at);
