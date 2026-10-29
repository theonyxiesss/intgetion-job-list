-- U6 (TZ 48 s.8): delivery of a physical product to a hired creator. One row
-- per participation. The company writes shipped, the creator writes received
-- or a problem. The address is not stored here.
CREATE TABLE IF NOT EXISTS public.ugc_shipments (
  invite_id uuid PRIMARY KEY REFERENCES public.ugc_invites(id) ON DELETE CASCADE,
  carrier text NOT NULL,
  tracking text NOT NULL,
  expected_date date,
  shipped_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz,
  problem text,
  problem_at timestamptz,
  CONSTRAINT ugc_shipments_carrier_check CHECK (char_length(carrier) BETWEEN 1 AND 60),
  CONSTRAINT ugc_shipments_tracking_check CHECK (char_length(tracking) BETWEEN 1 AND 60),
  CONSTRAINT ugc_shipments_problem_check
    CHECK (problem IS NULL OR problem IN ('not_arrived', 'damaged', 'wrong_item'))
);

SELECT public.enable_rls_deny_all('public.ugc_shipments');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_shipments TO app_rw;
