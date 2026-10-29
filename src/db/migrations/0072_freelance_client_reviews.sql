-- D568: the freelancer rates the client after a completed order (A2 of TZ 44).
-- Only the average and the count reach other freelancers; texts stay private.
CREATE TABLE IF NOT EXISTS public.freelance_client_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.freelance_orders(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_client_reviews_order_key UNIQUE (order_id),
  CONSTRAINT freelance_client_reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT freelance_client_reviews_body_check CHECK (char_length(body) <= 1000)
);

CREATE INDEX IF NOT EXISTS freelance_client_reviews_buyer_idx
  ON public.freelance_client_reviews (buyer_id);

SELECT public.enable_rls_deny_all('public.freelance_client_reviews');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_client_reviews TO app_rw;
