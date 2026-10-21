-- D518, step 2: the payout address lives in user_wallets (0068). Applied
-- only after the code that reads user_wallets is live: production and local
-- runs share the cloud database. Payments and rewards keep their own
-- recipient columns; no financial history is in this table.
DROP TABLE IF EXISTS public.freelance_payout_wallets;
