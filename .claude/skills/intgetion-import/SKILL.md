---
name: intgetion-import
description: >-
  INTGETION JOB LIST job aggregation: the ingestion pipeline in
  src/modules/ingestion, live job sources (Remotive, Himalayas, Jobicy,
  Remote OK, company career boards on Greenhouse, Lever and Ashby), the
  hourly import cron, dedup, freshness and expiry, which sources may go to
  the Telegram channel and RSS, and how to add a new source legally. Use when
  the task mentions import, импорт, агрегатор, aggregator, a job source, API
  вакансий, Greenhouse, Lever, Ashby, Adzuna, Reed, USAJobs, hh.ru,
  import_runs, import_sources, job_sources, IMPORT_LIVE_ENABLED or
  /api/cron/import.
---

# Import (aggregator) — INTGETION JOB LIST

`AGENTS.md`, `docs/tz/13-import.md` and the D numbers below win over this file. Database work: skill `intgetion-supabase`. Deploy and crons: skill `intgetion-vercel`.

## Where things are

- Pipeline: `src/modules/ingestion/service/ingest-fixtures.ts` (runs), `normalize.ts`, `dedup.ts`, `outcome.ts`, `fixture-guard.ts`. Queries: `repo/import-repo.ts`.
- Live sources: `src/modules/ingestion/adapters/` — one `LiveSource` per source. `LIVE_SOURCES` in `ingest-fixtures.ts` is the list that runs.
- Company career boards: `adapters/company-boards.ts` — one source per company (D416).
- Writes into `jobs`: `saveImportedJob` / `expireImportedJobs` in `src/modules/jobs/service/imported-jobs.ts` (cross-module, through the jobs service).
- Channel and RSS allowlist: `src/config/import-sources.ts` (D412).
- Cron: `src/app/api/cron/import/route.ts`, schedule in `vercel.json`.
- Tables: `import_sources` (one row per source, `enabled`, `republish_allowed`), `job_sources` (source, external id, `last_seen_at`, one primary row per job), `import_runs` (one row per run, `error` set on failure, timeout or partial run).

## How a run works (D375, D412, D416)

1. Each cron call runs **one** live source: the most overdue one outside its `minIntervalMs`. Every started run counts toward the interval, so the source's request limit holds.
2. Unfinished runs older than 15 minutes are closed as `timed_out`.
3. Fetch → `findLinkedJobIds` (one query) → `touchSourceRows` marks every listed known job as seen → new jobs first (at most `newPerRun`), then known ones, until the 200 s budget (`maxDuration` 300).
4. Normalize → company (imported, never an internal one) → dedup → outcome → `saveImportedJob`.
5. Expiry: `feed: "window"` sources (newest N only) expire a job after 30 days unseen or at the source's expiry date. `feed: "full"` sources (a company's whole board) also expire a job the moment it is gone from the board — never on an empty answer.
6. Removed, closed and paused jobs are never brought back by a feed. Fixtures run only against a local database.

## Adding a source — checklist

1. **Official API or feed only.** No HTML scraping, no login, no CAPTCHA, no bypassing limits (D18). Google Jobs is never a source (D211).
2. **Read the terms** and write down: may another commercial site show the jobs; attribution and link-back; request limit; may jobs go to third-party sites (Telegram, RSS); full description allowed. If the terms forbid commercial use or are missing, stop and ask the founder.
3. **Founder approval** per source in MISSION_LOG: `founder approved: republish allowed — <source>` (D18). A key-based source needs the founder's own registration; never create accounts.
4. Write the adapter: map to `RawImportedJob`, keep the source's page or the employer's page as `applyUrl`, `plain()` HTML, set `feed`, `minIntervalMs`, `newPerRun`, `staleAfterMs`. Put place into `workFormat` / `location` / `countries` only when the data says it; otherwise leave it out.
5. Keys go to `.env.local` and Vercel production (skill `intgetion-vercel`), never into git or chat. The source stays off while its key is empty.
6. Channel and RSS: add the source to `SYNDICATED_IMPORT_SOURCES` only if its terms allow third-party sites.
7. Tests: a mapping test with a realistic row, including a row the adapter must refuse.

## Checks after a change

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Integration (`ingestion.integration.test.ts`) needs a local Supabase — CI. After deploy, read `import_runs` (read-only SQL): every run has `finished_at`, no new `timed_out`, each source has a successful run within its interval.

## Traps

- The cloud database serves localhost and production. A local run with `IMPORT_LIVE_ENABLED=true` writes to the live catalog.
- Never delete imported jobs to clean up: set `status = 'removed'` with a `job_status_history` row, so it can be undone (D412 cleanup used `cleanup_d412_*`).
- Approved but not built: Adzuna (key plus Adzuna's written consent for commercial use and an «Adzuna» label on each job), Reed and USAJobs (keys), hh.ru (app registration). Not allowed: We Work Remotely, Arbeitnow (non-commercial licence), Indeed, LinkedIn.
