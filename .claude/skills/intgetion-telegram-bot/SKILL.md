---
name: intgetion-telegram-bot
description: >-
  INTGETION JOB LIST Telegram bot @intgetion_bot: webhook, sign-in handoff,
  Spoki replies in the bot chat, /help and /reset, job links and plan buttons.
  Use when the task mentions the Telegram bot, webhook, Bot API, t.me,
  @intgetion_bot, TELEGRAM_BOT_TOKEN, or how Spoki answers inside Telegram.
---

# Telegram bot — INTGETION JOB LIST

`AGENTS.md` (safe zone, D405) and `docs/tz/12-bot.md` win if they disagree with this skill. Login widget, Mini App, personal notifications and the Jobs Alert channel: skill `intgetion-telegram`. Site chat UI: `docs/how-it-works/bot.md`. Ops steps: `docs/RUNBOOK.md` §14.

## One bot

- Public bot `@intgetion_bot`. The link is `TELEGRAM_BOT_URL` in `src/config/telegram.ts`. It is not a secret.
- `TELEGRAM_BOT_TOKEN` is server-only. Never print it, log it, or put it in git or chat. Check presence by name only. Without it, `POST /api/telegram/webhook` answers **404** and the cron reports Telegram disabled.
- The webhook secret is derived from that token (`telegramWebhookSecret` in `src/modules/auth/service/telegram.ts`). There is no separate secret variable. Rotating the token changes the secret and breaks the live webhook until `setWebhook` runs again. That rotation needs the founder's yes even after a broader yes.

## Webhook

- Route: `src/app/api/telegram/webhook/route.ts`. Telegram calls it with no `Origin`. The path is excluded from the CSRF origin check (`src/lib/origin.ts`, D313). Do not put the origin check back. The header `x-telegram-bot-api-secret-token` is the auth.
- Order inside the route: sign-in first (`handleTelegramWebhook`), then the agent (`handleTelegramAgentUpdate`) only when sign-in did not take the update (D311). Auth must not import the bot module. The route is the only place that calls both, and only through each module's `service/index.ts`.
- `ensureTelegramWebhook` runs only when the site host is not localhost (`siteOwnsTelegramWebhook`). A local dev server must not point the live bot at itself.
- A body over 100kb is acknowledged with 200 and dropped. A handler throw returns 500 so Telegram retries.

## What the bot chat is

- Ordinary text uses the same `handleMessage` as the site: same prompt, same tools, same daily message caps. A prompt or tool change is a bot change: run `pnpm eval` and `src/modules/bot/__tests__/telegram-agent.test.ts`.
- The site look (centred greeting, three tabs, pill field, D408 and D409) lives in `src/components/bot/chat.tsx`. Telegram does not render that page. Replies are plain text plus URL buttons. Do not port the tabs into the bot.
- The bot thread is not the website thread. The session token is an HMAC of `tg:<chatId>` (`chatSessionToken`). `/reset` swaps that token in a process-local map. The website cookie `bot_session` is a different conversation.
- Language of the fixed lines (errors, /help, /reset) comes from the Telegram account `language_code` in `src/modules/bot/service/telegram-agent.ts`. The model's own sentences follow the prompt.

## Commands and buttons

- Bare `/start`, or `/start` with a payload that is not `login_<code>`, is answered by the sign-in handler with its hello. The agent never sees `/start`.
- `/start login_<code>` and a `callback_query` for that code confirm sign-in (D256). Any other callback is swallowed there. The agent does not answer callbacks.
- `/help` and `/reset` are the agent's commands. Any other slash command is ignored.
- Job results: up to five titles, each an inline URL button to `/jobs/{id}` on this site.
- `offer_step` is an inline URL button (`sendTelegramLinks`), not a typed URL and not a web card (D362). Only `https://` links, at most eight, label at most 64 characters. Telegram does not call the site back when the button is pressed.
- A write that needs confirmation (apply, profile) is not confirmed inside Telegram. A signed-in person gets a button to `/chat`. A guest gets `/login?next=chat`.
- Outbound text is plain: no `parse_mode`. `sendMessage` for notifications goes through `src/lib/telegram-bot.ts` (slice 4000, link previews off). A 403 from Telegram means the person blocked the bot: do not retry.

## Do not

- Send a message into a live chat, call `setWebhook`, or change BotFather, to "try it". Production and localhost share one database; the webhook on https://intgetion.com is the live bot.
- Invent a second bot, a second webhook path, or WhatsApp. WhatsApp is V2 and not built.
