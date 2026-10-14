---
name: intgetion-supabase
description: >-
  INTGETION JOB LIST database and auth on Supabase: SQL migrations in
  src/db/migrations, the cloud project shared by localhost and production,
  roles app_rw and schema owner, RLS deny-all, Drizzle schema, Auth settings
  (Site URL, redirects, Google, X, Send Email hook), storage and the Supabase
  MCP. Use when the task mentions Supabase, migration, миграция, SQL, schema,
  RLS, Postgres, DATABASE_URL, db:migrate, Auth settings, providers or the
  email hook.
---

# Supabase — INTGETION JOB LIST

`AGENTS.md` (safe zone, D405), `docs/tz/04-data.md` and `docs/how-it-works/auth.md` win if they disagree with this skill. Generic Postgres and Supabase guidance lives in the plugin skills `supabase` and `supabase-postgres-best-practices`. Deploy and env vars: skill `intgetion-vercel`.

## One cloud project serves both localhost and production

- The cloud project `intgetion-dev` (Free plan) is the database and Auth of https://intgetion.com. `.env.local` points `pnpm dev` at the same project. Despite the name, it holds live data: real users, payments and imported jobs.
- So a local click, a seed, a script or an integration test that reads `.env.local` writes production.
  - Integration tests against the cloud only read, or delete what they created (`docs/PARALLEL_WORK.md` rule 8).
  - `db:seed:*` and `admin:grant` are not run against the cloud without the founder's yes.
- The local stack (`supabase start`) needs Docker, which is usually missing on this Windows machine. Migration from scratch runs in CI: `scripts/ci-db.sh`, job `database`. When it was not run locally, report it as not run.
- `supabase/config.toml` mirrors the cloud Auth settings for CI and local. Change both together.

## How the app reaches the database

- Data goes through Drizzle over `pg` as role **`app_rw`** (`DATABASE_URL`, pooler transaction mode), on the server only: `src/db/client.ts`, schema in `src/db/schema/*.ts`.
- `DATABASE_MIGRATION_URL` is the schema-owner role, used only by migrations.
- TLS is verified with the bundled Supabase Root 2021 CA (`src/db/ssl.ts`, `src/db/supabase-root-2021-ca.pem`). Never `rejectUnauthorized: false`, never `sslmode=no-verify`.
- Every public table has RLS on and forced, with no policies (deny-all). The browser never reads tables through PostgREST. Checks: `pnpm db:verify` and `src/db/rls.integration.test.ts`.
- Auth uses `@supabase/ssr` in `src/lib/supabase/` (`server.ts`, `proxy.ts`, `session-*`). `sb-*` cookies last 400 days and are HttpOnly (D314); one refresh per process (D398). Read `docs/how-it-works/auth.md` before changing any of it.
- Service role (`SUPABASE_SERVICE_ROLE_KEY`, `src/lib/supabase/admin.ts`) is server-only: Auth admin calls and Storage (company logos, `src/modules/companies/service/storage.ts`). It never goes into a `NEXT_PUBLIC_*` variable or a client component.
- Other modules reach the database only through `src/modules/<m>/service/index.ts`.

## Writing a migration

- File: `src/db/migrations/NNNN_snake_name.sql`, four digits, the next free number. Before taking a number, check `ls src/db/migrations`, `docs/PARALLEL_WORK.md` and the latest D entries: another branch may hold it.
- Plain SQL, forward only, no down files. Use `IF NOT EXISTS` where it is cheap.
- A new table follows the existing pattern (see `0046_sanctions.sql`):

  ```sql
  CREATE TABLE IF NOT EXISTS public.example (...);
  SELECT public.enable_rls_deny_all('public.example');
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.example TO app_rw;
  ```

- Update the Drizzle schema in `src/db/schema/*.ts` in the same task; schema and SQL must match.
- Safe order: additive change first (new nullable column or column with a default, new table), code that uses it after. Code that reads a column before the migration is on the cloud breaks production and localhost together (the `0031` incident: the auth callback failed).
- Drop, rename, `NOT NULL` on an existing column, or anything that deletes data: two steps, and ask again even after a yes.
- Note the migration number in the D entry, MISSION_LOG and the report.

## Applying migrations

- Ledger: `public.schema_migrations(filename)`. `pnpm db:migrate` applies the files missing from the ledger, in name order.
- Before any apply, compare the ledger with the folder. Known difference: the ledger has `0020_telegram_login.sql` with no file in the folder; that is fine. Any other unexpected difference: stop and report.
- `pnpm db:migrate`, `pnpm db:verify` and `pnpm admin:grant` refuse every non-loopback host, including `*.supabase.co` and `*.supabase.com` (guard in `scripts/db-url.mjs`, test `src/db/migration-guard.test.ts`, commit `41f735d`). Do not weaken the guard, add hosts to it, or pass flags to get around it.
- Applying to the cloud is a cloud write and needs the founder's yes. Since the guard, the repo has no agreed path for it: ask the founder how, and record the answer as a D entry. Do not use MCP `apply_migration`: it records into `supabase_migrations.schema_migrations`, not our ledger, so the two would disagree.
- Order with deploy: migration on the cloud first, then the code deploy.

## Reading the cloud (allowed without asking)

- Supabase MCP read tools: `list_tables`, `get_advisors` (security and performance; run after any DDL), `query_logs`, `get_project`, `list_extensions`, `search_docs`.
- `execute_sql` is allowed only for `SELECT`. Report counts and ids, never emails, names or other personal data.
- Before the first MCP call, confirm the project ref matches the subdomain of `NEXT_PUBLIC_SUPABASE_URL`. The MCP can see other projects.
- Any `INSERT`, `UPDATE`, `DELETE` or DDL, through the MCP, a script or the dashboard, is a cloud write and needs the founder's yes.

## Auth settings (dashboard)

Current state. Changing it is a cloud write: founder's yes, then update `supabase/config.toml` and `docs/how-it-works/auth.md` too.

- Site URL `https://intgetion.com`. Redirect URLs include `https://intgetion.com/**` and localhost.
- Send Email Hook → `https://intgetion.com/api/auth/hooks/send-email` (Resend, D325/D326). Its secret is `AUTH_SEND_EMAIL_HOOK_SECRET` in Vercel. While the hook is on, dashboard email templates are not used; `supabase/templates/` is the fallback.
- Providers: email and password (minimum 10 characters), magic link, Google (D335), X OAuth 2.0 (D336). Manual linking is on (D339). Telegram login is our own code, not a Supabase provider.
- A custom auth domain (`auth.intgetion.com`) needs a paid plan: ask again.

## Stop and ask again even after a yes

Deleting data, tables or users; truncate or database reset; plan upgrade, add-ons, PITR, branches (cost money); pausing or restoring the project; rotating the anon or service-role key (breaks live sessions, RUNBOOK §10); removing an Auth provider.

## Report lines for a Supabase task

Migration files and numbers; where each is applied (CI, cloud, or not yet); the ledger comparison result; advisors after DDL; Auth settings changed (names, never secrets).
