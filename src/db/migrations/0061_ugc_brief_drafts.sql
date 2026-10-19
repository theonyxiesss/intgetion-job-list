-- D492: editable UGC brief shared by Spoki and the campaign form.
ALTER TABLE public.ugc_campaigns
  ADD COLUMN IF NOT EXISTS countries text[] NOT NULL DEFAULT '{}';

UPDATE public.ugc_campaigns
SET countries = ARRAY[country]
WHERE country IS NOT NULL AND cardinality(countries) = 0;

ALTER TABLE public.ugc_campaigns
  ADD CONSTRAINT ugc_campaigns_countries_check
  CHECK (cardinality(countries) <= 20);

CREATE TABLE IF NOT EXISTS public.ugc_brief_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_brief_drafts_object_check CHECK (jsonb_typeof(draft) = 'object'),
  CONSTRAINT ugc_brief_drafts_assumptions_check CHECK (jsonb_typeof(assumptions) = 'array')
);

CREATE INDEX IF NOT EXISTS ugc_brief_drafts_user_updated_idx
  ON public.ugc_brief_drafts (user_id, updated_at DESC);

SELECT public.enable_rls_deny_all('public.ugc_brief_drafts');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_brief_drafts TO app_rw;
