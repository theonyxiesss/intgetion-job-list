-- UGC campaign wallet (D465, D466). The company pays the brief budget to the
-- platform wallet through the checkout. Rewards and the rest go out by hand
-- from that wallet; the server checks each transaction before it marks a row.

CREATE TABLE IF NOT EXISTS public.ugc_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  payer_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  chain text NOT NULL,
  token text NOT NULL,
  token_contract text NOT NULL,
  recipient text NOT NULL,
  payer_address text NOT NULL,
  amount_minor bigint NOT NULL,
  token_amount numeric(30, 0) NOT NULL,
  status text NOT NULL DEFAULT 'open',
  reason text,
  tx_hash text,
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_deposits_token_check CHECK (token IN ('USDC', 'USDT')),
  CONSTRAINT ugc_deposits_status_check CHECK (
    status IN ('open', 'submitted', 'confirmed', 'failed', 'frozen')
  ),
  CONSTRAINT ugc_deposits_amount_check CHECK (
    amount_minor BETWEEN 500 AND 1500000
  ),
  CONSTRAINT ugc_deposits_recipient_check CHECK (recipient ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT ugc_deposits_payer_check CHECK (payer_address ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT ugc_deposits_tx_check CHECK (
    tx_hash IS NULL OR tx_hash ~ '^0x[0-9a-f]{64}$'
  )
);

-- A transaction pays once and a brief is paid in once. Failed tries do not
-- reserve a hash.
CREATE UNIQUE INDEX IF NOT EXISTS ugc_deposits_tx_idx
  ON public.ugc_deposits (chain, tx_hash)
  WHERE status = 'confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS ugc_deposits_paid_idx
  ON public.ugc_deposits (campaign_id)
  WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS ugc_deposits_campaign_idx
  ON public.ugc_deposits (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ugc_deposits_submitted_idx
  ON public.ugc_deposits (created_at)
  WHERE status = 'submitted';

-- The rest of a closed brief, sent back to the address it came from.
CREATE TABLE IF NOT EXISTS public.ugc_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  deposit_id uuid NOT NULL REFERENCES public.ugc_deposits(id) ON DELETE CASCADE,
  amount_minor bigint NOT NULL,
  chain text NOT NULL,
  token text NOT NULL,
  recipient text NOT NULL,
  tx_hash text NOT NULL,
  refunded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_refunds_campaign_key UNIQUE (campaign_id),
  CONSTRAINT ugc_refunds_tx_key UNIQUE (chain, tx_hash),
  CONSTRAINT ugc_refunds_amount_check CHECK (amount_minor BETWEEN 1 AND 1500000),
  CONSTRAINT ugc_refunds_token_check CHECK (token IN ('USDC', 'USDT')),
  CONSTRAINT ugc_refunds_recipient_check CHECK (recipient ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT ugc_refunds_tx_check CHECK (tx_hash ~ '^0x[0-9a-f]{64}$')
);

-- A reward paid from the campaign wallet keeps its transaction. A reward of a
-- brief without a deposit is still marked by hand, without a hash (D459).
ALTER TABLE public.ugc_payouts
  ADD COLUMN IF NOT EXISTS chain text,
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS recipient text,
  ADD COLUMN IF NOT EXISTS tx_hash text;

ALTER TABLE public.ugc_payouts
  ADD CONSTRAINT ugc_payouts_tx_check CHECK (
    tx_hash IS NULL
    OR (
      status = 'paid'
      AND tx_hash ~ '^0x[0-9a-f]{64}$'
      AND chain IS NOT NULL
      AND token IN ('USDC', 'USDT')
      AND recipient ~ '^0x[0-9a-f]{40}$'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS ugc_payouts_tx_idx
  ON public.ugc_payouts (chain, tx_hash)
  WHERE tx_hash IS NOT NULL;

SELECT public.enable_rls_deny_all('public.ugc_deposits');
SELECT public.enable_rls_deny_all('public.ugc_refunds');

GRANT SELECT, INSERT, UPDATE ON public.ugc_deposits TO app_rw;
GRANT SELECT, INSERT ON public.ugc_refunds TO app_rw;
