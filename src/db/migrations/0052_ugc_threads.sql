-- D457: one site thread per campaign and per invite, and one deadline note.

ALTER TABLE public.ugc_invites
  ADD COLUMN IF NOT EXISTS deadline_noted boolean NOT NULL DEFAULT false;

ALTER TABLE public.bot_conversations
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invite_id uuid REFERENCES public.ugc_invites(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS bot_conversations_user_campaign_idx
  ON public.bot_conversations (user_id, campaign_id)
  WHERE user_id IS NOT NULL AND campaign_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bot_conversations_user_invite_idx
  ON public.bot_conversations (user_id, invite_id)
  WHERE user_id IS NOT NULL AND invite_id IS NOT NULL;
