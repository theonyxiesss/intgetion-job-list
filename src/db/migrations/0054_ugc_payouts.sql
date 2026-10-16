-- Phase C (D459): a recorded reward. No transfer. The rail is still open.

CREATE TABLE IF NOT EXISTS public.ugc_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.ugc_submissions(id) ON DELETE CASCADE,
  invite_id uuid NOT NULL REFERENCES public.ugc_invites(id) ON DELETE CASCADE,
  amount_minor bigint NOT NULL,
  status text NOT NULL,
  paid_at timestamptz,
  paid_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_payouts_submission_key UNIQUE (submission_id),
  CONSTRAINT ugc_payouts_status_check CHECK (status IN ('owed', 'paid')),
  CONSTRAINT ugc_payouts_amount_check CHECK (amount_minor BETWEEN 500 AND 50000),
  CONSTRAINT ugc_payouts_paid_pair CHECK (
    (status = 'owed' AND paid_at IS NULL AND paid_by IS NULL)
    OR (status = 'paid' AND paid_at IS NOT NULL AND paid_by IS NOT NULL)
  )
);

SELECT public.enable_rls_deny_all('public.ugc_payouts');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_payouts TO app_rw;
