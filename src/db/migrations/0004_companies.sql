-- 3A: company membership and possible-duplicate moderation records.
-- pg_trgm is installed by migration 0003 (2A).

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  slug text NOT NULL UNIQUE,
  domain text,
  website_url text,
  description text CHECK (description IS NULL OR length(description) <= 5000),
  logo_path text,
  country char(2),
  size company_size,
  legal_name text,
  registration_number text,
  status company_status NOT NULL DEFAULT 'unverified',
  origin company_origin NOT NULL DEFAULT 'internal',
  is_trusted boolean NOT NULL DEFAULT false,
  trusted_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (domain IS NULL OR domain = lower(domain))
);

CREATE INDEX companies_domain_idx ON public.companies (domain) WHERE domain IS NOT NULL;
CREATE INDEX companies_status_idx ON public.companies (status);
CREATE INDEX companies_name_trgm_idx ON public.companies USING gin (name extensions.gin_trgm_ops);
CREATE TRIGGER companies_set_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
SELECT public.enable_rls_deny_all('public.companies');

CREATE TABLE public.company_members (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role member_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);
CREATE INDEX company_members_user_idx ON public.company_members (user_id, created_at);
SELECT public.enable_rls_deny_all('public.company_members');

CREATE TABLE public.employer_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name text CHECK (full_name IS NULL OR length(full_name) <= 120),
  title text CHECK (title IS NULL OR length(title) <= 120),
  linkedin_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER employer_profiles_set_updated_at
BEFORE UPDATE ON public.employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
SELECT public.enable_rls_deny_all('public.employer_profiles');

-- 10A owns queue processing and UI; 3A only creates possible-duplicate rows.
CREATE TABLE public.moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status moderation_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_queue_status_idx ON public.moderation_queue (status, created_at);
SELECT public.enable_rls_deny_all('public.moderation_queue');
