---
name: intgetion-vercel
description: >-
  INTGETION JOB LIST on Vercel: production deploy of intgetion.com, environment
  variables, crons in vercel.json, security headers, domains, post-deploy checks
  and rollback. Use when the task mentions Vercel, deploy, выкладка, production,
  preview, env vars, vercel.json, cron, a dpl_ id, intgetion.com or
  admin.intgetion.com.
---

# Vercel — INTGETION JOB LIST

`AGENTS.md` (safe zone, D405) and `docs/tz/18-ops.md` win if they disagree with this skill. Generic Vercel how-to lives in the plugin skills `env-vars`, `deployments-cicd`, `vercel-cli`. This file holds only what is specific to this project. Database and Auth: skill `intgetion-supabase`.

## Project

- Vercel project `intgetion-job-list`. Team and project ids are in `.vercel/project.json` (gitignored). Read them from there; do not guess.
- Production: https://intgetion.com. The GitHub repo is public.
- Production and `pnpm dev` on localhost use the same Supabase project. A broken deploy and a broken local run hit the same data.
- The Vercel API or MCP sometimes answers 403 for this team. Then take deploy status from the GitHub commit status and say so in the report.

## Two ways to deploy — say which one you used

1. **Branch, green CI, then master** → the GitHub integration builds production from the commit. This is the normal path. `master` is protected (D526): GitHub accepts a commit only after the CI jobs `check` and `database` passed on that exact commit, for the owner too; no force-push, no deleting `master`.
   - Push the branch, wait until both jobs are green (`gh run watch <id> --exit-status`), then `git push origin <branch>:master` (fast-forward, same commit). A push of an untested commit is rejected with `protected branch hook declined`; do not try to get around it.
   - Before the release step, `git ls-remote origin master`: if `master` moved, stop and compare (2026-10-21 someone on this machine moved it outside the release).
   - `[skip ci]` commits cannot reach `master`: they never get the checks. Write the "Record … on the site" note without `[skip ci]` and push it the same way (branch → CI → master), or fold it into the next change.
   - A flaky CI failure blocks `master` until the job is re-run (`gh run rerun <id> --failed`). A hotfix waits for CI too; only the founder may switch the protection off (GitHub → Settings → Branches).
2. **`npx vercel deploy --prod`** from the working folder → uploads the working tree, uncommitted files included (used for D403 on 2026-10-14).
   Trap: the next push to `master` builds from git and drops those files. After a CLI deploy, list the uncommitted files that are now live and write in `docs/CURRENT.md` that they must be committed.

Both are outside the safe zone: they need the founder's yes in this task. A request that says "deploy", "выложи", "на сайт" or "add it on Vercel" is that yes (AGENTS.md → Finish the asked outcome).

Before deploying: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` are green locally. On Windows set `SWC_NATIVE_BINDING_CACHE` as in `docs/PARALLEL_WORK.md` rule 5. A migration the new code needs is applied first (skill `intgetion-supabase`).

## After deploy — verify, do not assume

- The deployment is `READY` and the alias `intgetion.com` points at it (`vercel inspect <url>` or MCP `get_deployment`).
- `curl -s https://intgetion.com/ | grep -o 'data-dpl-id="[^"]*"'` shows the new `dpl_…` id.
- `https://intgetion.com/api/health` → 200. Every page the task changed → 200.
- Header or CSP change → `curl -sI` on the affected path and on one ordinary page.
- Runtime errors: MCP `get_runtime_logs` / `get_runtime_errors` or `vercel logs <url>`.
- Report the `dpl_…` id, the URL, and whether it was a commit or the working tree.

## Environment variables

Names, meaning and "what if empty": `docs/RUNBOOK.md` §2, rules in `scripts/env-rules.mjs`, check with `pnpm env:check`.

- Never print a value — not in chat, logs, commits or MISSION_LOG. Check presence by name or length only.
- Never run `vercel env pull .env.local`. It overwrites the file, replaces `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (CSRF and login then fail locally) and drops local-only keys. If you need a value, pull into a file in the scratchpad and copy only the named key.
- Sensitive production variables cannot be read back by the CLI (example: Tron and Solana addresses). Do not invent a substitute.
- `NEXT_PUBLIC_*` values are inlined at build time. Any env change takes effect only on a new deployment, so an env write without a redeploy is not finished.
- Name the environment explicitly. Default for this project: **production only**, unless the founder asks for preview or development too (D403 wrote production only).
- Add without the value touching chat or shell history: `printf '%s' "$VALUE" | vercel env add NAME production`. A generated secret goes straight from `openssl rand -base64 32` into the store. A secret from a third-party dashboard is pasted by the founder, or read from `.env.local` by the script; it never passes through the chat.
- Rotating a secret that live users depend on (`UNSUBSCRIBE_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, anon key) breaks them. See RUNBOOK §10, and ask again even after a yes.
- Flags that change live behaviour (`BILLING_ENABLED`, `IMPORT_LIVE_ENABLED`, `ADMIN_HOST_ONLY`, `TELEGRAM_MINI_APP_ENABLED`) are switched only when the task names them.

## Crons

- The schedule is in `vercel.json`. Each route is `src/app/api/cron/<name>/route.ts`.
- Every cron route answers **404** without `Authorization: Bearer $CRON_SECRET`. That is by design, not a bug.
- Manual run: `curl -H "Authorization: Bearer $CRON_SECRET" https://intgetion.com/api/cron/<name>`, with the secret loaded from env and never echoed. A manual run on production is a cloud write: ask first.
- New cron: entry in `vercel.json`, a route with the same `authorized()` check, a row in the RUNBOOK §4 table. Changing an existing schedule is a product decision (example: D395 keeps `telegram` at `*/5`).

## Headers and CSP

- Built in `src/proxy.ts` and `src/lib/security-headers.ts`, a shared file (`docs/PARALLEL_WORK.md` rule 6). Read `node_modules/next/dist/docs/` first: this Next.js differs from training data.
- Extra hosts are allowed per path only. The crypto pay page is the one exception today (skill `.cursor/skills/walletconnect/SKILL.md`, D403, D406). Ordinary pages must not gain third-party hosts.

## Domains

- `admin.intgetion.com`: RUNBOOK §13, flag `ADMIN_HOST_ONLY`, check with `pnpm admin:check-host https://admin.intgetion.com`.
- `auth.intgetion.com` is not enabled: it needs a paid Supabase add-on.
- DNS changes, domain purchase or transfer: ask again even after a yes.

## Rollback

- Instant rollback or promoting an older deployment (`vercel rollback`, MCP `request_rollback` / `request_promote`) is a production write: founder's yes.
- After an instant rollback Vercel stops auto-assigning the production domain to new deployments until one is promoted. Say this in the report.
- A Vercel rollback does not roll back the database. A migration already applied stays.

## Stop and ask again even after a yes

Plan upgrade or anything that costs money, DNS, deleting a project, deployment or env var that is in use, rotating a live secret, turning on a live-behaviour flag the task did not name.

## Report lines for a Vercel task

`dpl_…` id and URL; source (commit hash, or "working tree" plus the uncommitted files); env names changed and environments (never values); checks run with their results.
