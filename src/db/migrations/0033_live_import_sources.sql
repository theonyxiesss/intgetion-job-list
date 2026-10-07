-- D342: live import (8B). The founder approved republishing from these four
-- official APIs (MISSION_LOG 2026-10-07, D18). Each is on and allowed here;
-- nothing runs until IMPORT_LIVE_ENABLED=true, and the admin can switch a
-- source off on /admin/import. Terms per source are in docs/tz/13-import.md.

INSERT INTO public.import_sources (name, kind, url, enabled, republish_allowed)
VALUES
  ('Remotive', 'api', 'https://remotive.com/api/remote-jobs', true, true),
  ('Himalayas', 'api', 'https://himalayas.app/jobs/api', true, true),
  ('Jobicy', 'api', 'https://jobicy.com/api/v2/remote-jobs?count=100', true, true),
  ('Remote OK', 'api', 'https://remoteok.com/api', true, true)
ON CONFLICT (name) DO UPDATE
  SET kind = EXCLUDED.kind,
      url = EXCLUDED.url,
      republish_allowed = true;
