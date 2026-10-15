-- D446, D447: freelance services (docs/tz/28-freelance.md).
-- A ready piece of work by one person, with a fixed price and term.
-- Not a job post and not a /services brief. The platform never holds money.
-- The browser never reads these tables; the app reaches them as app_rw.

-- A person who takes orders. The storefront comes from candidate_profiles.
CREATE TABLE IF NOT EXISTS public.freelance_sellers (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  accepting boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  buyer_needs text NOT NULL DEFAULT '',
  -- ISO 639-1, lower case.
  languages text[] NOT NULL,
  skill_slugs text[] NOT NULL DEFAULT '{}',
  -- https only; checked by the app, the count is checked here.
  links text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  moderation_note text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_services_slug_key UNIQUE (slug),
  CONSTRAINT freelance_services_title_len CHECK (char_length(title) BETWEEN 10 AND 80),
  CONSTRAINT freelance_services_description_len CHECK (
    char_length(description) BETWEEN 80 AND 1500
  ),
  CONSTRAINT freelance_services_needs_len CHECK (char_length(buyer_needs) <= 800),
  CONSTRAINT freelance_services_category_check CHECK (
    category IN (
      'operations', 'community', 'growth', 'product', 'development',
      'web3', 'people', 'research', 'design', 'communications'
    )
  ),
  CONSTRAINT freelance_services_languages_check CHECK (
    cardinality(languages) BETWEEN 1 AND 5
    AND array_to_string(languages, ',') ~ '^[a-z]{2}(,[a-z]{2})*$'
  ),
  CONSTRAINT freelance_services_skills_count CHECK (cardinality(skill_slugs) <= 6),
  CONSTRAINT freelance_services_links_count CHECK (cardinality(links) <= 5),
  CONSTRAINT freelance_services_status_check CHECK (
    status IN ('draft', 'pending', 'published', 'paused', 'rejected', 'removed')
  )
);

CREATE INDEX IF NOT EXISTS freelance_services_status_category_idx
  ON public.freelance_services (status, category);
CREATE INDEX IF NOT EXISTS freelance_services_seller_idx
  ON public.freelance_services (seller_id);
CREATE INDEX IF NOT EXISTS freelance_services_skills_idx
  ON public.freelance_services USING gin (skill_slugs);

-- Price in USD cents (D19). basic is required, standard and pro optional.
CREATE TABLE IF NOT EXISTS public.freelance_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.freelance_services(id) ON DELETE CASCADE,
  tier text NOT NULL,
  price_minor bigint NOT NULL,
  delivery_days integer NOT NULL,
  revisions integer NOT NULL,
  includes text[] NOT NULL,
  CONSTRAINT freelance_packages_service_tier_key UNIQUE (service_id, tier),
  CONSTRAINT freelance_packages_tier_check CHECK (tier IN ('basic', 'standard', 'pro')),
  CONSTRAINT freelance_packages_price_check CHECK (price_minor BETWEEN 1000 AND 2000000),
  CONSTRAINT freelance_packages_days_check CHECK (delivery_days BETWEEN 1 AND 90),
  CONSTRAINT freelance_packages_revisions_check CHECK (revisions BETWEEN 0 AND 10),
  CONSTRAINT freelance_packages_includes_count CHECK (cardinality(includes) BETWEEN 1 AND 8)
);

-- A request and the order it becomes are one row, with a snapshot of the
-- package at request time. Status changes only through the module's
-- transitionOrder; every change goes to freelance_order_history.
CREATE TABLE IF NOT EXISTS public.freelance_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.freelance_services(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  buyer_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  service_title text NOT NULL,
  package_tier text NOT NULL,
  price_minor bigint NOT NULL,
  delivery_days integer NOT NULL,
  revisions_left integer NOT NULL,
  task text NOT NULL,
  wanted_by text,
  status text NOT NULL DEFAULT 'sent',
  delivery_url text,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  started_at timestamptz,
  delivered_at timestamptz,
  auto_complete_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_orders_tier_check CHECK (package_tier IN ('basic', 'standard', 'pro')),
  CONSTRAINT freelance_orders_price_check CHECK (price_minor BETWEEN 1000 AND 2000000),
  CONSTRAINT freelance_orders_days_check CHECK (delivery_days BETWEEN 1 AND 90),
  CONSTRAINT freelance_orders_revisions_check CHECK (revisions_left BETWEEN 0 AND 10),
  CONSTRAINT freelance_orders_task_len CHECK (char_length(task) BETWEEN 20 AND 2000),
  CONSTRAINT freelance_orders_wanted_len CHECK (
    wanted_by IS NULL OR char_length(wanted_by) BETWEEN 1 AND 80
  ),
  CONSTRAINT freelance_orders_status_check CHECK (
    status IN (
      'sent', 'accepted', 'in_progress', 'delivered',
      'completed', 'declined', 'cancelled', 'expired'
    )
  ),
  CONSTRAINT freelance_orders_delivery_url_check CHECK (
    delivery_url IS NULL OR delivery_url ~ '^https://'
  ),
  CONSTRAINT freelance_orders_not_self CHECK (
    seller_id IS NULL OR buyer_id IS NULL OR seller_id <> buyer_id
  )
);

-- One open request per buyer and service.
CREATE UNIQUE INDEX IF NOT EXISTS freelance_orders_open_pair_idx
  ON public.freelance_orders (service_id, buyer_id)
  WHERE status IN ('sent', 'accepted', 'in_progress', 'delivered');
CREATE INDEX IF NOT EXISTS freelance_orders_seller_idx
  ON public.freelance_orders (seller_id, status);
CREATE INDEX IF NOT EXISTS freelance_orders_buyer_idx
  ON public.freelance_orders (buyer_id, status);
CREATE INDEX IF NOT EXISTS freelance_orders_expires_idx
  ON public.freelance_orders (status, expires_at);
CREATE INDEX IF NOT EXISTS freelance_orders_auto_complete_idx
  ON public.freelance_orders (status, auto_complete_at);

CREATE TABLE IF NOT EXISTS public.freelance_order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.freelance_orders(id) ON DELETE CASCADE,
  -- null on the row that created the request.
  from_status text,
  to_status text NOT NULL,
  -- null when the system moved it (timers, payment).
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS freelance_order_history_order_idx
  ON public.freelance_order_history (order_id, created_at);

-- One public review per completed order, without the buyer's name.
CREATE TABLE IF NOT EXISTS public.freelance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.freelance_orders(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.freelance_services(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_kind text NOT NULL,
  rating smallint NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_reviews_order_key UNIQUE (order_id),
  CONSTRAINT freelance_reviews_kind_check CHECK (author_kind IN ('person', 'company')),
  CONSTRAINT freelance_reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT freelance_reviews_body_len CHECK (char_length(body) <= 1000)
);

CREATE INDEX IF NOT EXISTS freelance_reviews_service_idx
  ON public.freelance_reviews (service_id, created_at DESC);

SELECT public.enable_rls_deny_all('public.freelance_sellers');
SELECT public.enable_rls_deny_all('public.freelance_services');
SELECT public.enable_rls_deny_all('public.freelance_packages');
SELECT public.enable_rls_deny_all('public.freelance_orders');
SELECT public.enable_rls_deny_all('public.freelance_order_history');
SELECT public.enable_rls_deny_all('public.freelance_reviews');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_sellers TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_services TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_packages TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_orders TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_order_history TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_reviews TO app_rw;
