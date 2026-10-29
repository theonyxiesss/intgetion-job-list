-- U7 (TZ 48 s.10): a problem raised on an order by one of its parties, and how
-- support closed it. Support records the outcome; nothing is paid or changed
-- by this table. One unresolved dispute per participation.
CREATE TABLE IF NOT EXISTS public.ugc_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.ugc_invites(id) ON DELETE CASCADE,
  opened_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  side text NOT NULL,
  reason text NOT NULL,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  outcome text,
  resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_disputes_side_check CHECK (side IN ('company', 'creator')),
  CONSTRAINT ugc_disputes_reason_check
    CHECK (reason IN ('no_response', 'quality', 'payment', 'link', 'other')),
  CONSTRAINT ugc_disputes_status_check
    CHECK (status IN ('open', 'in_review', 'resolved')),
  CONSTRAINT ugc_disputes_outcome_check
    CHECK (outcome IS NULL OR outcome IN ('company', 'creator', 'agreed', 'dismissed')),
  CONSTRAINT ugc_disputes_note_check CHECK (char_length(note) <= 500),
  CONSTRAINT ugc_disputes_resolved_check
    CHECK ((status = 'resolved') = (outcome IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS ugc_disputes_one_unresolved_idx
  ON public.ugc_disputes (invite_id) WHERE status <> 'resolved';

CREATE INDEX IF NOT EXISTS ugc_disputes_status_idx
  ON public.ugc_disputes (status, created_at);

SELECT public.enable_rls_deny_all('public.ugc_disputes');
GRANT SELECT, INSERT, UPDATE ON public.ugc_disputes TO app_rw;
