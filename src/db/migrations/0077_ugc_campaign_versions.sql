-- U3b (TZ 48 s.5): history of a brief's texts. One row per saved change,
-- written by the service; rows are never updated or deleted by the app.
CREATE TABLE IF NOT EXISTS public.ugc_campaign_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  version integer NOT NULL,
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_fields text[] NOT NULL DEFAULT '{}',
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_campaign_versions_key UNIQUE (campaign_id, version),
  CONSTRAINT ugc_campaign_versions_version_check CHECK (version >= 1)
);

SELECT public.enable_rls_deny_all('public.ugc_campaign_versions');

GRANT SELECT, INSERT ON public.ugc_campaign_versions TO app_rw;
