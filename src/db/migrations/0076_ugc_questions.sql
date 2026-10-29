-- U3b (TZ 48 s.5-6): questions a brief asks at application, the creator's
-- answers, and the safe reason a company gives when it turns an application down.
-- Additive: empty array / null by default. Table rights are unchanged.
ALTER TABLE public.ugc_campaigns
  ADD COLUMN IF NOT EXISTS questions text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT ugc_campaigns_questions_count CHECK (cardinality(questions) <= 3);

ALTER TABLE public.ugc_invites
  ADD COLUMN IF NOT EXISTS answers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD CONSTRAINT ugc_invites_decline_reason_check CHECK (
    decline_reason IS NULL OR decline_reason IN ('not_fit', 'filled', 'other')
  );
