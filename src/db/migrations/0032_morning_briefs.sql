-- D340: morning briefs in three regional slots (docs/tz/20-morning-briefs.md).
-- One cron reads these slots, so the admin can move a slot or pause it
-- without a deploy. A delivery row per person and slot day stops a second
-- brief, whatever the cron does.

CREATE TABLE IF NOT EXISTS public.brief_slots (
  id text PRIMARY KEY,
  timezone text NOT NULL,
  local_time text NOT NULL DEFAULT '08:00',
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brief_slots_id_check CHECK (id IN ('americas', 'europe', 'cis')),
  CONSTRAINT brief_slots_time_check CHECK (local_time ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$')
);

INSERT INTO public.brief_slots (id, timezone, local_time) VALUES
  ('americas', 'America/Chicago', '08:00'),
  ('europe', 'Europe/Berlin', '08:00'),
  ('cis', 'Europe/Moscow', '08:00')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.brief_settings (
  id boolean PRIMARY KEY DEFAULT true,
  paused boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brief_settings_single_row CHECK (id)
);

INSERT INTO public.brief_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.brief_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id text NOT NULL REFERENCES public.brief_slots(id),
  slot_date date NOT NULL,
  dry_run boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  checked integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  empty integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  error text
);

-- One live run per slot and local day; dry runs may repeat.
CREATE UNIQUE INDEX IF NOT EXISTS brief_runs_live_once_idx
  ON public.brief_runs (slot_id, slot_date) WHERE NOT dry_run;
CREATE INDEX IF NOT EXISTS brief_runs_started_idx
  ON public.brief_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS public.brief_deliveries (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  audience text NOT NULL,
  slot_date date NOT NULL,
  slot_id text NOT NULL REFERENCES public.brief_slots(id),
  item_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, audience, slot_date),
  CONSTRAINT brief_deliveries_audience_check CHECK (audience IN ('candidate', 'employer'))
);

-- On by default: the hourly digest before D340 went to every candidate with a
-- time zone, so nobody loses it. The switch on /notifications comes in step B.
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS agent_briefs_enabled boolean NOT NULL DEFAULT true;

SELECT public.enable_rls_deny_all('public.brief_slots');
SELECT public.enable_rls_deny_all('public.brief_settings');
SELECT public.enable_rls_deny_all('public.brief_runs');
SELECT public.enable_rls_deny_all('public.brief_deliveries');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brief_slots TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brief_settings TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brief_runs TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brief_deliveries TO app_rw;
