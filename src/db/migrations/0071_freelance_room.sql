-- D566, D567: the order room. One thread per subject (an order now; a
-- proposal or a dispute later) and the parties' messages in it. Text lives
-- while the order is open and 180 days after it closed (retention cron).
CREATE TABLE IF NOT EXISTS public.freelance_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_threads_subject_type_check
    CHECK (subject_type IN ('order')),
  CONSTRAINT freelance_threads_subject_unique UNIQUE (subject_type, subject_id)
);

SELECT public.enable_rls_deny_all('public.freelance_threads');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_threads TO app_rw;

CREATE TABLE IF NOT EXISTS public.freelance_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.freelance_threads(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  links text[] NOT NULL DEFAULT '{}',
  hidden_at timestamptz,
  hidden_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT freelance_messages_body_check
    CHECK (char_length(body) BETWEEN 1 AND 2000),
  CONSTRAINT freelance_messages_links_check
    CHECK (cardinality(links) <= 5)
);

CREATE INDEX IF NOT EXISTS freelance_messages_thread_idx
  ON public.freelance_messages (thread_id, created_at);

SELECT public.enable_rls_deny_all('public.freelance_messages');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_messages TO app_rw;
