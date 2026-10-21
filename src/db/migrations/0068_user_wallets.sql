-- D518: the crypto wallet belongs to the account, not to one service. The
-- address a person proved with a SIWE signature receives freelance payments
-- and UGC rewards. One proven address belongs to one account only. Payments
-- and rewards keep their own recipient, so a change here never moves money
-- already on its way. Same shape as freelance_payout_wallets (0056), whose
-- rows move here; that table is dropped by 0069 after this code is live.
CREATE TABLE IF NOT EXISTS public.user_wallets (
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
  CONSTRAINT user_wallets_address_check CHECK (
    address IS NULL OR address ~ '^0x[0-9a-f]{40}$'
  ),
  CONSTRAINT user_wallets_pending_check CHECK (
    pending_address IS NULL OR pending_address ~ '^0x[0-9a-f]{40}$'
  ),
  CONSTRAINT user_wallets_verified_check CHECK (
    (address IS NULL) = (verified_at IS NULL)
    AND (address IS NULL) = (signature IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS user_wallets_address_key
  ON public.user_wallets (address)
  WHERE address IS NOT NULL;

INSERT INTO public.user_wallets
  (user_id, address, chain_id, signed_message, signature, verified_at,
   created_at, updated_at)
SELECT user_id, address, chain_id, signed_message, signature, verified_at,
       created_at, updated_at
FROM public.freelance_payout_wallets
WHERE address IS NOT NULL
ON CONFLICT DO NOTHING;

SELECT public.enable_rls_deny_all('public.user_wallets');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wallets TO app_rw;
