-- D413, D417: a business problem left on /services. Not a job post.
-- The browser never reads this table. Admins read it through the app.

CREATE TABLE IF NOT EXISTS public.engagement_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  task text NOT NULL,
  reply text NOT NULL,
  organization text,
  budget text,
  duration text,
  start_when text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engagement_briefs_task_len CHECK (char_length(task) BETWEEN 20 AND 4000),
  CONSTRAINT engagement_briefs_reply_len CHECK (char_length(reply) BETWEEN 3 AND 200),
  CONSTRAINT engagement_briefs_org_len CHECK (
    organization IS NULL OR char_length(organization) BETWEEN 1 AND 120
  ),
  CONSTRAINT engagement_briefs_budget_len CHECK (
    budget IS NULL OR char_length(budget) BETWEEN 1 AND 80
  ),
  CONSTRAINT engagement_briefs_duration_len CHECK (
    duration IS NULL OR char_length(duration) BETWEEN 1 AND 80
  ),
  CONSTRAINT engagement_briefs_start_len CHECK (
    start_when IS NULL OR char_length(start_when) BETWEEN 1 AND 80
  )
);

CREATE INDEX IF NOT EXISTS engagement_briefs_created_idx
  ON public.engagement_briefs (created_at DESC);

SELECT public.enable_rls_deny_all('public.engagement_briefs');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_briefs TO app_rw;
