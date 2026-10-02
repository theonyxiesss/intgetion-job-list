-- Migration 0001: enum types, users, app_rw grants, RLS deny-all template.
-- The migrate runner creates role app_rw on loopback databases before this file.
-- A hosted database must already have app_rw. This file never sets its password.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    RAISE EXCEPTION 'role app_rw is missing';
  END IF;
END
$$;

CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE platform_role AS ENUM ('user', 'admin');
CREATE TYPE work_format AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract');
CREATE TYPE salary_period AS ENUM ('hour', 'month', 'year');
CREATE TYPE salary_basis AS ENUM ('gross', 'net');
CREATE TYPE skill_level AS ENUM ('novice', 'intermediate', 'advanced', 'expert');
CREATE TYPE cefr_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native');
CREATE TYPE company_status AS ENUM (
  'unverified',
  'pending_verification',
  'verified',
  'rejected',
  'suspended'
);
CREATE TYPE company_origin AS ENUM ('internal', 'imported');
CREATE TYPE company_size AS ENUM (
  's1_10',
  's11_50',
  's51_200',
  's201_1000',
  's1000_plus'
);
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'recruiter', 'member');
CREATE TYPE job_status AS ENUM (
  'draft',
  'pending_moderation',
  'published',
  'paused',
  'expired',
  'closed',
  'removed'
);
CREATE TYPE job_source AS ENUM ('internal', 'imported');
CREATE TYPE application_method AS ENUM ('internal', 'external_url', 'email');
CREATE TYPE application_status AS ENUM (
  'applied',
  'viewed',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn'
);
CREATE TYPE feedback_action AS ENUM (
  'viewed',
  'saved',
  'unsaved',
  'applied',
  'applied_external',
  'dismissed',
  'hidden',
  'hidden_company'
);
CREATE TYPE report_reason AS ENUM (
  'scam',
  'spam',
  'fake_company',
  'discrimination',
  'wrong_info',
  'inappropriate',
  'other'
);
CREATE TYPE report_status AS ENUM ('open', 'confirmed', 'dismissed');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE notification_channel AS ENUM ('inapp', 'email');
CREATE TYPE verification_method AS ENUM ('corporate_email', 'dns_txt');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'expired', 'failed');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO app_rw;

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid uuid NOT NULL UNIQUE,
  platform_role platform_role NOT NULL DEFAULT 'user',
  status user_status NOT NULL DEFAULT 'active',
  locale text NOT NULL DEFAULT 'en',
  terms_accepted_at timestamptz NOT NULL,
  terms_version text NOT NULL,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT users_locale_check CHECK (locale IN ('en', 'ru'))
);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

GRANT USAGE ON SCHEMA public TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_rw;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM app_rw;

-- Template for later tables: anon and authenticated are denied; app_rw may use DML.
CREATE OR REPLACE FUNCTION public.enable_rls_deny_all(target regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  short_name text;
BEGIN
  SELECT c.relname INTO short_name FROM pg_class c WHERE c.oid = target;
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target);
  EXECUTE format(
    'REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated',
    target
  );
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', short_name || '_app_rw_all', target);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR ALL TO app_rw USING (true) WITH CHECK (true)',
    short_name || '_app_rw_all',
    target
  );
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', short_name || '_anon_deny', target);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR ALL TO anon USING (false) WITH CHECK (false)',
    short_name || '_anon_deny',
    target
  );
  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON %s',
    short_name || '_authenticated_deny',
    target
  );
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR ALL TO authenticated USING (false) WITH CHECK (false)',
    short_name || '_authenticated_deny',
    target
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enable_rls_deny_all(regclass) FROM PUBLIC;

SELECT public.enable_rls_deny_all('public.users');

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.schema_migrations FROM PUBLIC, anon, authenticated, app_rw;
