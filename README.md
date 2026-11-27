# INTGETION JOB LIST

Remote-first job platform. The spec is [`docs/TZ_INTGETION_v6.md`](docs/TZ_INTGETION_v6.md).

## Scripts

- `pnpm dev` — local app
- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e` — Playwright (`pnpm exec playwright install` once)
- `pnpm build`

## Integration tests

- `pnpm test:integration` runs only against a local database: start it with `supabase start`, then run the same flow as CI (`scripts/ci-db.sh`).
- The run refuses any `DATABASE_URL` or `DATABASE_MIGRATION_URL` whose host ends in `.supabase.co` or `.supabase.com` (pooler hosts included), see `src/test/guard-test-db.ts`.
- `ALLOW_HOSTED_DB_TESTS=1` overrides that refusal. Do not use it against the shared cloud database.

Subphase 0A is the repository scaffold. Product features start in later subphases.
