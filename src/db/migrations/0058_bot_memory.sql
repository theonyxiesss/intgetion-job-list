-- D469: Spoki memory. Short facts a signed-in person told Spoki about
-- themselves and their goals. Spoki reads them at the start of every thread
-- and does not ask again. The person sees, edits and erases them in
-- settings. No contacts and no secrets: the server screens every fact.

CREATE TABLE IF NOT EXISTS public.bot_memory_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fact text NOT NULL,
  source text NOT NULL DEFAULT 'chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bot_memory_facts_fact_check CHECK (
    char_length(fact) BETWEEN 1 AND 200
  ),
  CONSTRAINT bot_memory_facts_source_check CHECK (source IN ('chat', 'site'))
);

CREATE INDEX IF NOT EXISTS bot_memory_facts_user_idx
  ON public.bot_memory_facts (user_id, created_at);

SELECT public.enable_rls_deny_all('public.bot_memory_facts');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_memory_facts TO app_rw;
