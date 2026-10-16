-- D448: creative tests (docs/tz/27-ugc.md).
-- One brief, applications, a hire of a named creator, one review link.
-- Not a job, not engagement_briefs, not freelance_services.
-- No payment in this migration. The browser never reads these tables.

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  languages text[] NOT NULL,
  platforms text[] NOT NULL,
  niches text[] NOT NULL,
  country text,
  example_urls text[] NOT NULL DEFAULT '{}',
  invite_opt_in boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_profiles_name_len CHECK (char_length(display_name) BETWEEN 1 AND 80),
  CONSTRAINT creator_profiles_status_check CHECK (status IN ('active', 'paused')),
  CONSTRAINT creator_profiles_examples_count CHECK (cardinality(example_urls) <= 5),
  CONSTRAINT creator_profiles_platforms_check CHECK (
    cardinality(platforms) >= 1
    AND platforms <@ ARRAY['tiktok', 'reels', 'shorts']::text[]
  ),
  CONSTRAINT creator_profiles_niches_check CHECK (
    cardinality(niches) >= 1
    AND niches <@ ARRAY['app', 'game', 'finance', 'ecommerce', 'education', 'other']::text[]
  )
);

CREATE TABLE IF NOT EXISTS public.ugc_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  product_name text NOT NULL,
  product_summary text NOT NULL,
  goal text NOT NULL,
  niches text[] NOT NULL,
  audience text NOT NULL,
  country text,
  languages text[] NOT NULL,
  must_say text NOT NULL,
  must_not text NOT NULL,
  platforms text[] NOT NULL,
  videos_wanted integer NOT NULL,
  bounty_minor bigint NOT NULL,
  deadline date NOT NULL,
  rights text NOT NULL,
  pitch text NOT NULL DEFAULT '',
  example_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_campaigns_status_check CHECK (
    status IN ('draft', 'pending_review', 'open', 'closed', 'rejected')
  ),
  CONSTRAINT ugc_campaigns_goal_check CHECK (
    goal IN ('awareness', 'installs', 'purchases', 'waitlist')
  ),
  CONSTRAINT ugc_campaigns_rights_check CHECK (
    rights IN ('organic', 'ads', 'whitelist')
  ),
  CONSTRAINT ugc_campaigns_videos_check CHECK (videos_wanted BETWEEN 1 AND 30),
  CONSTRAINT ugc_campaigns_bounty_check CHECK (bounty_minor BETWEEN 500 AND 50000),
  CONSTRAINT ugc_campaigns_pitch_len CHECK (char_length(pitch) <= 300),
  CONSTRAINT ugc_campaigns_examples_count CHECK (cardinality(example_urls) <= 5),
  CONSTRAINT ugc_campaigns_platforms_check CHECK (
    cardinality(platforms) >= 1
    AND platforms <@ ARRAY['tiktok', 'reels', 'shorts']::text[]
  ),
  CONSTRAINT ugc_campaigns_niches_check CHECK (
    cardinality(niches) >= 1
    AND niches <@ ARRAY['app', 'game', 'finance', 'ecommerce', 'education', 'other']::text[]
  ),
  CONSTRAINT ugc_campaigns_languages_check CHECK (
    cardinality(languages) BETWEEN 1 AND 5
    AND array_to_string(languages, ',') ~ '^[a-z]{2}(,[a-z]{2})*$'
  )
);

CREATE INDEX IF NOT EXISTS ugc_campaigns_company_idx
  ON public.ugc_campaigns (company_id, status);
CREATE INDEX IF NOT EXISTS ugc_campaigns_open_idx
  ON public.ugc_campaigns (status, deadline);

CREATE TABLE IF NOT EXISTS public.ugc_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  bounty_minor bigint,
  rights text,
  pitch text NOT NULL DEFAULT '',
  reminders smallint NOT NULL DEFAULT 0,
  revision_used boolean NOT NULL DEFAULT false,
  offered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_invites_campaign_creator_key UNIQUE (campaign_id, creator_user_id),
  CONSTRAINT ugc_invites_status_check CHECK (
    status IN ('applied', 'offered', 'hired', 'declined', 'expired', 'withdrawn')
  ),
  CONSTRAINT ugc_invites_reminders_check CHECK (reminders BETWEEN 0 AND 1),
  CONSTRAINT ugc_invites_rights_check CHECK (
    rights IS NULL OR rights IN ('organic', 'ads', 'whitelist')
  )
);

CREATE INDEX IF NOT EXISTS ugc_invites_creator_idx
  ON public.ugc_invites (creator_user_id, status);

CREATE TABLE IF NOT EXISTS public.ugc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.ugc_invites(id) ON DELETE CASCADE,
  url text NOT NULL,
  hook text NOT NULL DEFAULT '',
  status text NOT NULL,
  change_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_submissions_invite_key UNIQUE (invite_id),
  CONSTRAINT ugc_submissions_status_check CHECK (
    status IN ('submitted', 'changes_requested', 'accepted', 'rejected', 'winner')
  ),
  CONSTRAINT ugc_submissions_note_len CHECK (char_length(change_note) <= 500)
);

CREATE TABLE IF NOT EXISTS public.ugc_join_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_join_tokens_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS ugc_join_tokens_campaign_idx
  ON public.ugc_join_tokens (campaign_id);

SELECT public.enable_rls_deny_all('public.creator_profiles');
SELECT public.enable_rls_deny_all('public.ugc_campaigns');
SELECT public.enable_rls_deny_all('public.ugc_invites');
SELECT public.enable_rls_deny_all('public.ugc_submissions');
SELECT public.enable_rls_deny_all('public.ugc_join_tokens');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_profiles TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_campaigns TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_invites TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_submissions TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ugc_join_tokens TO app_rw;
