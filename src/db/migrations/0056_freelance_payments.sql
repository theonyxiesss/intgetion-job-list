-- Migration 0056: a freelancer's payout address and order payments (28.6, D463).
-- The platform never holds money: the buyer sends USDC or USDT straight to the
-- address the freelancer proved with a SIWE signature. The server reads the
-- receipt itself; a confirmed transaction hash counts once.

CREATE TABLE IF NOT EXISTS public.freelance_payout_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  address text,
  chain_id integer,
  signed_message text,
  signature text,
  verified_at timestamptz,
  pending_address text,
  pending_chain_id integer,
  pending_message text,
  pending_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_payout_wallets_address_check CHECK (
    address IS NULL OR address ~ '^0x[0-9a-f]{40}$'
  ),
  CONSTRAINT freelance_payout_wallets_pending_check CHECK (
    pending_address IS NULL OR pending_address ~ '^0x[0-9a-f]{40}$'
  ),
  CONSTRAINT freelance_payout_wallets_verified_check CHECK (
    (address IS NULL) = (verified_at IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.freelance_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.freelance_orders(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
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
  CONSTRAINT freelance_order_payments_token_check CHECK (token IN ('USDC', 'USDT')),
  CONSTRAINT freelance_order_payments_status_check CHECK (
    status IN ('open', 'submitted', 'confirmed', 'failed', 'frozen')
  ),
  CONSTRAINT freelance_order_payments_amount_check CHECK (
    amount_minor BETWEEN 1000 AND 2000000
  ),
  CONSTRAINT freelance_order_payments_recipient_check CHECK (
    recipient ~ '^0x[0-9a-f]{40}$'
  ),
  CONSTRAINT freelance_order_payments_tx_check CHECK (
    tx_hash IS NULL OR tx_hash ~ '^0x[0-9a-f]{64}$'
  )
);

-- A transaction pays once, and an order is paid once. Failed tries do not
-- reserve a hash, so nobody can block a real payment with a foreign hash.
CREATE UNIQUE INDEX IF NOT EXISTS freelance_order_payments_tx_idx
  ON public.freelance_order_payments (chain, tx_hash)
  WHERE status = 'confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS freelance_order_payments_paid_idx
  ON public.freelance_order_payments (order_id)
  WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS freelance_order_payments_order_idx
  ON public.freelance_order_payments (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS freelance_order_payments_submitted_idx
  ON public.freelance_order_payments (created_at)
  WHERE status = 'submitted';

SELECT public.enable_rls_deny_all('public.freelance_payout_wallets');
SELECT public.enable_rls_deny_all('public.freelance_order_payments');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_payout_wallets TO app_rw;
GRANT SELECT, INSERT, UPDATE ON public.freelance_order_payments TO app_rw;
