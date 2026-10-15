---
name: intgetion-security
description: >-
  INTGETION JOB LIST security: response headers and CSP, CSRF origin check,
  RLS deny-all and the app_rw role, secrets in .env.local and Vercel only, the
  scraper trap (D218), rate limits, signed tokens and webhook signatures, crypto
  checkout checks, LLM tool rights, and a checklist for reviewing a diff. Use
  when the task mentions security, безопасность, уязвимость, CSP, headers,
  CSRF, XSS, IDOR, RLS, secret, секрет, rate limit, лимит, signature, подпись,
  token, webhook, scraping, парсинг, or before saying a diff that touches auth,
  billing, API routes or src/proxy.ts is done.
---

# Security — INTGETION JOB LIST

**Before any audit, read [`docs/security/AUDIT_LOG.md`](../../../docs/security/AUDIT_LOG.md).** It lists what was checked, on which commit, and the open findings. Re-check an area only if its files changed after that commit (`git diff --stat <commit> -- <files>`), and add your own entry on top when you finish.

`AGENTS.md` (safe zone, D405) and `docs/tz/16-security.md` win if they disagree with this skill. Database details: skill `intgetion-supabase`. Deploy and env: skill `intgetion-vercel`. Crypto pay page and its CSP: `.cursor/skills/walletconnect/SKILL.md`. This file holds only what is specific to this project.

## Headers and CSP

- Page CSP is built per request in `src/proxy.ts` with `buildCsp()` from `src/lib/security-headers.ts`. One nonce per request (`createNonce()`), passed to Next.js through the `x-nonce` and request `content-security-policy` headers. Both files are shared (`docs/PARALLEL_WORK.md` rule 6). Read `node_modules/next/dist/docs/` before changing them.
- Static headers for every response (`staticSecurityHeaders`, wired in `next.config.ts`): HSTS two years with subdomains, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` with camera, microphone, geolocation, payment and usb off. `X-Frame-Options: DENY` is dropped only while `TELEGRAM_MINI_APP_ENABLED=true`, because then `frame-ancestors` in the CSP decides (D259).
- JSON responses use `apiCsp` (`default-src 'none'; frame-ancestors 'none'`).
- Base policy: `default-src 'self'`, `script-src 'self' 'nonce-…'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. `'unsafe-eval'` only when `NODE_ENV=development`.
- Exceptions exist **per path or per flag only**, each with its D number:
  - Telegram Mini App flag: `https://telegram.org` scripts and Telegram as frame ancestor (D259, D324). Never on the admin host.
  - Crypto pay page (`isCryptoPayPath`): WalletConnect relay, verify, fonts, images and `style-src 'unsafe-inline'` (D403, D406).
  - Foreign frames: allowlist in `src/lib/embedded-sites.ts`, empty today (D400).
- An ordinary page never gains a third-party host, `'unsafe-inline'` for scripts, or a wildcard. A new exception is a new D entry, a branch in `buildCsp()` keyed to the path, and a test in `src/lib/security.test.ts`.
- `dangerouslySetInnerHTML` only with a constant script (theme, Telegram hash) under the nonce, or `serializeJsonLd()` in `src/modules/seo/json-ld.tsx`. Never with user, job, company or LLM text.
- Check after a header change: `curl -sI` on the changed path and on one ordinary page, locally and after deploy.

## CSRF and request entry

- `src/proxy.ts` refuses a mutating `/api/*` call whose `Origin` is not the site origin (`src/lib/origin.ts`, `isAllowedOrigin`). A request with no `Origin` is refused too.
- `SECRET_AUTHENTICATED` in `origin.ts` lists the routes that skip the Origin check because the caller is a server: the Telegram webhook (D313) and the Supabase Send Email hook (D325). A route goes on that list only when it verifies its own secret or signature first, and gets a test that a wrong secret is refused.
- Cookies: `sb-*` are HttpOnly, SameSite=Lax (D314). Session refresh happens in the proxy before API handlers (D398). Do not move it.
- Bodies: read with `readBodyLimited` / `readFormDataLimited` (`src/lib/http/body-limit.ts`) and validate with zod through `readJson` / `readQuery` (`src/lib/http/handler.ts`). Errors go out through `src/lib/http/errors.ts`, with no stack or SQL in the response.

## Who may do what

- Guards in `src/lib/auth-guards.ts`: `requireUser`, `requireAdmin`, `requireCandidate`, `requireMembership`. Every route and server action that reads or writes someone's data calls one, then checks ownership of the exact row (IDOR). A new route with an id in the path gets an IDOR test: another user's id → 404 or 403.
- Admin actions and contact reads write `audit_logs` through `src/lib/audit.ts` (16.1).
- Cross-module calls only through `src/modules/<m>/service/index.ts`; a module never reads another module's tables directly.

## Database: RLS deny-all and app_rw

- The app talks to Postgres as `app_rw` (DML, no DDL) on the server only. Migrations use the schema-owner role. The browser never reads tables through PostgREST.
- Every public table has RLS enabled and forced. A new table calls `public.enable_rls_deny_all('public.<name>')` in the same migration (template in skill `intgetion-supabase`). That function (`0001_enums_and_users.sql`) creates exactly three policies: `<table>_app_rw_all` (`USING (true)` for `app_rw`) and `USING (false)` deny policies for `anon` and `authenticated`. It also grants DML to all three roles, so the deny policies are what keeps PostgREST out (SEC-20261014-7). Never add any other policy, never write a permissive policy for `anon` or `authenticated`, never drop the deny policies, never disable RLS.
- Checks: `pnpm db:verify`, `src/db/rls.integration.test.ts` (CI).
- SQL only through Drizzle or the `sql` tagged template. No string concatenation, no `sql.raw()` with anything a user sent.
- TLS to the database is verified with the bundled CA (`src/db/ssl.ts`). Never `rejectUnauthorized: false`.
- Service role (`SUPABASE_SERVICE_ROLE_KEY`, `src/lib/supabase/admin.ts`) is server-only: Auth admin calls and Storage. It never reaches a client component or a `NEXT_PUBLIC_*` name.

## Secrets

- Values live only in `.env.local` (local) and Vercel environment variables (production). Names and meaning: `docs/RUNBOOK.md` §2, rules in `scripts/env-rules.mjs`, check with `pnpm env:check`.
- Never print a value in chat, logs, MISSION_LOG, a test snapshot or a commit. Check presence by name or length. Never `vercel env pull .env.local` (skill `intgetion-vercel`).
- `NEXT_PUBLIC_*` is shipped to every browser. A secret never gets that prefix, and a client component never imports a module that reads a server secret.
- CI runs gitleaks on every push (`.github/workflows/ci.yml`). A leaked secret is rotated per RUNBOOK §10; rotating a live one breaks users, so ask again even after a yes.
- Editing `.env*` or Vercel env is outside the safe zone: founder's yes.

## Scraping (D218, P-SCRAPE)

- `robots.txt` blocks SEO crawlers and AI-training crawlers for the whole site; search engines stay allowed (D210, D211).
- Guest JSON reads of the catalog (`GET /api/jobs`, `GET /api/jobs/:id`) use bucket `publicApi`, 120 per minute per IP. CDN hits do not count. Signed-in users are not limited there.
- The trap: a hidden footer link (`hidden`, `rel="nofollow"`, `tabIndex=-1`) to `SCRAPER_TRAP_PATH` = `/api/catalog-export` (`src/modules/seo/site.ts`), under `Disallow: /api/`. The route logs `scrape.trap` with `privacyHash(ip)` and User-Agent and answers a plain 404. Keep the link hidden, keep the path disallowed and out of the sitemap, never link it from visible UI, never make it return data or a different status.
- Rate limits on HTML catalog pages are a Vercel Firewall rule, not app code (a DB counter per page view would cost a query per view).

## Rate limits

- All buckets live in `rateRules` in `src/lib/rate-limit.ts`. Use `enforceRateLimit(bucket, subject)`; it throws 429 with `Retry-After`. Fixed DB window (D26); keys are hashed with `privacyHash`, so no raw IP or email is stored.
- Subject: user id when signed in; IP from `clientIp()` (`src/lib/request-ip.ts`) for guests; IP + email for login.
- Anything that sends email, posts to Telegram, calls an LLM, writes on a guest's behalf, starts a payment or can be brute-forced gets a bucket. Add it to `rateRules` with a comment naming the D number; do not write a second limiter.
- Raising a limit, or keying it more loosely, is a product decision with a D entry.

## Signatures and secrets in links

- Email links: `signToken` / `verifyToken` in `src/lib/signed-token.ts` (D231). HMAC-SHA256 over `purpose.payload`, expiry inside the payload, constant-time compare. Every link type has its own `purpose` string; never reuse one, never accept a token without an expiry.
- Telegram Login Widget and Mini App `initData`: hash check in `src/modules/auth/service/telegram.ts`. Webhook: `X-Telegram-Bot-Api-Secret-Token` derived from the bot token (same file).
- Supabase Send Email hook: Standard Webhooks signature in `src/modules/auth/service/send-email-hook.ts`.
- Cron routes answer **404** without `Authorization: Bearer $CRON_SECRET`.
- Any comparison of a secret, hash or signature uses `timingSafeEqual` after a length check. Never `===` on a secret.

## Crypto checkout

- A transfer counts only when `src/lib/billing/verify-transfer.ts` passes every check: receipt status, Transfer log of the right token, recipient, payer, amount, age, confirmations, and not on the OFAC list (`sanctions.ts`, D380). The tx hash is unique in the database.
- Never trust an amount, address, chain or status sent by the client; read it from the chain (`rpc.ts`) and from our order row. Wallet sign-in is SIWE (`siwe.ts`, D353).
- Billing routes have their own buckets (`billingSiwe`, `billingOrder`, `billingConfirm`, `billingInterest`).

## LLM and the bot (16.2)

- Every job text, company text, message and imported description is untrusted input to Spoki.
- A tool re-checks the caller's rights itself; the model never decides who may read or write. A write needs the user's explicit confirmation.
- LLM output is shown as text or safe Markdown; links only to our domain or job URLs from our database. No PII in logs (`src/lib/logger.ts`); hash identifiers with `privacyHash`.
- Bot prompt or tool change → `pnpm eval`.

## Checklist for a diff

Walk it before saying a security-relevant change is done. Each "no" is a finding.

1. New or changed `/api/*` route: guard from `auth-guards.ts`, row ownership check, zod validation, body limit, rate-limit bucket where it sends, writes for guests, costs money or can be brute-forced.
2. Mutating route skips the Origin check only if it is in `SECRET_AUTHENTICATED` and verifies its own signature.
3. New table: `enable_rls_deny_all`, no policy besides the three it creates, Drizzle schema matches.
4. SQL built only with Drizzle or `sql`…`` with bound values.
5. No secret value in the diff, test fixtures, logs or `NEXT_PUBLIC_*`. New env name is in `.env.example`, `scripts/env-rules.mjs` and RUNBOOK §2.
6. CSP and headers: no new host, `'unsafe-inline'` or wildcard outside a named path exception; `security.test.ts` updated with the change.
7. No `dangerouslySetInnerHTML` with dynamic text; no user URL in `href` without a scheme check (`http`/`https` only).
8. Token, hash, signature: purpose-bound, expiring, compared with `timingSafeEqual`.
9. Logs and errors: no PII, no token, no SQL, no stack trace to the client.
10. Scraper trap untouched: link hidden, path disallowed, 404.
11. Crypto: values read from chain and order, never from the request.
12. Bot tools re-check rights; LLM output rendered as text.
13. Dependency added: reason in the report; it is a safe-zone action.

## Review tools

- The audit log `docs/security/AUDIT_LOG.md` comes first: findings get the id `SEC-<date>-<n>`, and open ones are mirrored in `docs/OPEN_TASKS.md`.

- Claude Code built-in `/security-review`: reviews the pending changes on the branch.
- Cursor `review-security` (`~/.cursor/skills-cursor/review-security/`): one security-review subagent on branch or uncommitted changes.
- Plugin `claude-security@claude-plugins-official`, once the founder has installed it (D419): `/claude-security` scans the diff or the codebase in-session. It writes `CLAUDE-SECURITY-<timestamp>/` into the repo; keep that folder out of git and out of the report text beyond the findings.
- The working tree is shared with other agents: review your own files, and name findings in other agents' files as follow-ups instead of fixing them.

## Stop and ask

Rotating a live secret, weakening RLS or a grant, adding a CSP host or frame ancestor outside a named exception, raising a rate limit, turning off the Origin check for a route, changing the scraper trap, or any cloud write. These need the founder's yes in chat even inside a security task.
