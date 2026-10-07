-- D341: one channel post per job. The stamp is set only after Telegram accepts
-- the message. Old published jobs stay unmarked; the cron uses this file's
-- applied_at in schema_migrations as the watermark and does not backfill them.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS jobs_alert_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS jobs_alert_pending_idx
  ON public.jobs (id)
  WHERE status = 'published' AND jobs_alert_sent_at IS NULL;

-- The app role cannot see schema_migrations (RLS, no policy). Without this
-- read it would never learn the watermark and would post nothing.
GRANT SELECT ON public.schema_migrations TO app_rw;

DROP POLICY IF EXISTS schema_migrations_app_rw_jobs_alert ON public.schema_migrations;
CREATE POLICY schema_migrations_app_rw_jobs_alert
  ON public.schema_migrations
  FOR SELECT
  TO app_rw
  USING (filename = '0033_jobs_alert.sql');
