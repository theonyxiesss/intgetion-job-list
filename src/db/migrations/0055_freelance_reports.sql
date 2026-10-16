-- Migration 0055: complaints about a freelance service or order (28.9, D461).
-- The shared reports table keeps one row per reporter and object; only the
-- allowed entity types grow. No data changes.

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_entity_type_check;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_entity_type_check CHECK (
    entity_type IN ('job', 'company', 'user', 'freelance_service', 'freelance_order')
  );

-- Open complaints per object, for the three-in-a-row pause.
CREATE INDEX IF NOT EXISTS reports_entity_open_idx
  ON public.reports (entity_type, entity_id)
  WHERE status = 'open';
