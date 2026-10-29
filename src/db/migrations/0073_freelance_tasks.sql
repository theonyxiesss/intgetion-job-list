-- D569: tasks posted by clients and freelancers' proposals (A3 of TZ 44).
-- A task is public after a moderator; an accepted proposal becomes an order.
CREATE TABLE IF NOT EXISTS public.freelance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  buyer_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  budget_min_minor bigint,
  budget_max_minor bigint,
  wanted_by text,
  status text NOT NULL DEFAULT 'pending',
  moderation_note text,
  hired_order_id uuid REFERENCES public.freelance_orders(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_tasks_status_check
    CHECK (status IN ('pending', 'open', 'hired', 'closed', 'expired', 'rejected')),
  CONSTRAINT freelance_tasks_title_check
    CHECK (char_length(title) BETWEEN 10 AND 120),
  CONSTRAINT freelance_tasks_description_check
    CHECK (char_length(description) BETWEEN 80 AND 2000),
  CONSTRAINT freelance_tasks_wanted_by_check
    CHECK (wanted_by IS NULL OR char_length(wanted_by) <= 80),
  CONSTRAINT freelance_tasks_budget_check
    CHECK (
      (budget_min_minor IS NULL OR budget_min_minor BETWEEN 1000 AND 2000000)
      AND (budget_max_minor IS NULL OR budget_max_minor BETWEEN 1000 AND 2000000)
      AND (budget_min_minor IS NULL OR budget_max_minor IS NULL OR budget_min_minor <= budget_max_minor)
    )
);

CREATE INDEX IF NOT EXISTS freelance_tasks_open_idx
  ON public.freelance_tasks (status, created_at DESC);
CREATE INDEX IF NOT EXISTS freelance_tasks_buyer_idx
  ON public.freelance_tasks (buyer_id, created_at DESC);

SELECT public.enable_rls_deny_all('public.freelance_tasks');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_tasks TO app_rw;

CREATE TABLE IF NOT EXISTS public.freelance_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.freelance_tasks(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  price_minor bigint NOT NULL,
  delivery_days integer NOT NULL,
  cover text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_proposals_task_seller_key UNIQUE (task_id, seller_id),
  CONSTRAINT freelance_proposals_status_check
    CHECK (status IN ('sent', 'accepted', 'declined', 'withdrawn')),
  CONSTRAINT freelance_proposals_price_check
    CHECK (price_minor BETWEEN 1000 AND 2000000),
  CONSTRAINT freelance_proposals_days_check
    CHECK (delivery_days BETWEEN 1 AND 90),
  CONSTRAINT freelance_proposals_cover_check
    CHECK (char_length(cover) BETWEEN 40 AND 2000)
);

CREATE INDEX IF NOT EXISTS freelance_proposals_seller_idx
  ON public.freelance_proposals (seller_id, created_at DESC);

SELECT public.enable_rls_deny_all('public.freelance_proposals');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_proposals TO app_rw;
