-- D382: one web conversation per signed-in user and job.
-- 0043–0045 are the language migrations, 0046 is the sanctions list.

ALTER TABLE public.bot_conversations
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS bot_conversations_user_job_idx
  ON public.bot_conversations (user_id, job_id)
  WHERE user_id IS NOT NULL AND job_id IS NOT NULL;
