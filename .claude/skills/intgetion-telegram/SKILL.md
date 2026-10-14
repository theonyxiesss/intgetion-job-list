---
name: intgetion-telegram
description: >-
  INTGETION JOB LIST on Telegram besides the bot chat: Login Widget, deep-link
  sign-in, linking and unlinking Telegram on the account, the Mini App window,
  personal notification messages, and the Jobs Alert channel. Use when the task
  mentions Telegram login, Mini App, tgWebAppData, linking Telegram, Jobs Alert,
  JOBS_ALERT_CHAT_ID, or the telegram cron.
---

# Telegram — INTGETION JOB LIST

`AGENTS.md` (safe zone, D405), `docs/how-it-works/auth.md` and `docs/tz/15-notifications.md` win if they disagree with this skill. The bot conversation itself (webhook, Spoki replies, /help, /reset): skill `intgetion-telegram-bot`. Deploy and env writes: skill `intgetion-vercel`.

The same bot `@intgetion_bot` and the same `TELEGRAM_BOT_TOKEN` serve login, notifications and the channel. Never print the token.

## Five surfaces, one token

| Surface                               | Entry                                                                                     | Notes                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Login Widget and deep link            | `src/app/api/auth/telegram/*`, `src/components/auth/telegram-login-button.tsx`            | D256, D339                                                   |
| Link or unlink on an existing account | `link/route.ts`, `unlink/route.ts`                                                        | Same block on settings and profile                           |
| Mini App                              | `src/components/auth/telegram-mini-app.tsx`, `src/app/api/auth/telegram/miniapp/route.ts` | Phone path is OPEN. Do not start it unless the task names it |
| Personal notifications                | `src/modules/notifications/service/telegram-dispatch.ts`                                  | Preference switch, D329                                      |
| Jobs Alert channel                    | `src/modules/jobs/service/jobs-alert.ts`                                                  | Template, no LLM, D341                                       |

Cross-module calls go through `src/modules/<m>/service/index.ts`.

## Sign-in and linking

- The site button opens `https://t.me/<username>?start=login_<code>`. The webhook confirms that code. A bare `/start` is only the hello, not a login.
- An account that exists only through Telegram has a stand-in email (D230). Offer a real email from account settings. Do not ask the bot to collect an email address.
- Linking Telegram, Google and X is one block (D339), on `/settings/account` and on `/profile`. Manual linking is already on in cloud Supabase. Do not merge two accounts that already exist.
- A ban stores a hash of the Telegram id (`privacyHash`). Do not log the raw id next to an email.

## Mini App

- Flag `TELEGRAM_MINI_APP_ENABLED` (`src/config/flags.ts`). It lets Telegram frame the site. Off unless this task turns it on. Turning it on is a live-behaviour change: founder's yes, then a redeploy (skill `intgetion-vercel`). BotFather menu URL without the flag opens a blank frame because of `frame-ancestors`.
- Desktop Telegram Web is a frame on `web.telegram.org`. Session cookies there are `SameSite=None; Secure; Partitioned` (D315). The phone webview is the top document, not a frame: those partitioned cookies do not stick, so the phone path uses `SameSite=Lax` only when the page is actually framed (D320, D321). Do not flip the default back to "always partitioned".
- `Telegram.WebApp.initData` and the hash `#/path?tgWebAppData=` are the sign-in payload. The parser must keep the path before `?` and the query after it (D321). A redirect that drops the hash loses the login on phones.
- "Open in browser" reserves the window in the click handler, before `await fetch` (D318). On a phone, `Telegram.WebApp.openLink` leaves Telegram. A URL that is not our `/auth/callback` is neither opened nor shown.
- The official `telegram-web-app.js` is allowed in CSP only while the Mini App flag is on (`src/lib/security-headers.ts`). Do not add it to every page.
- Phone Mini App stays OPEN (`docs/OPEN_TASKS.md`, D318–D322). A task about the bot chat does not include building the next Mini App slice.

## Notifications and the channel

- Cron `GET /api/cron/telegram` (`vercel.json`, every 5 minutes). Without `Authorization: Bearer $CRON_SECRET` the route answers **404**. That is the check, not a bug.
- One tick sends personal notification messages first, then at most one Jobs Alert channel post (D395). Posts already sent are not edited and not sent again.
- `JOBS_ALERT_CHAT_ID` is set on production only. Do not invent a chat id. The sender is `src/lib/telegram-bot.ts`: plain text, previews off. 403 means the chat blocked the bot.
- Hitting this cron on production sends real messages. That is a cloud write: founder's yes.
- The in-app switch "new jobs in the Telegram bot" is the user's preference (D329). Do not force it on.

## Env names

`TELEGRAM_BOT_TOKEN`, `TELEGRAM_MINI_APP_ENABLED`, `JOBS_ALERT_CHAT_ID`, `CRON_SECRET`. Values stay in `.env.local` and Vercel. Never `vercel env pull .env.local` (skill `intgetion-vercel`).

## Stop and ask again even after a yes

BotFather changes, setting or deleting the webhook, rotating `TELEGRAM_BOT_TOKEN`, turning on `TELEGRAM_MINI_APP_ENABLED`, changing `JOBS_ALERT_CHAT_ID`, or sending a channel or personal message on production.
