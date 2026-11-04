# Telegram — как устроено

Своего модуля у Telegram нет: каждый модуль держит свою часть, общий вход — один webhook. Скиллы: `.claude/skills/intgetion-telegram-bot/` (бот, D410) и `.claude/skills/intgetion-telegram/` (вход, Mini App, рассылка, канал).

## Что делает

- **Бот @intgetion_bot** (`src/config/telegram.ts`): Spoki отвечает в чате бота, `/help`, `/reset`, ссылки на вакансии и кнопки тарифов.
- **Вход и привязка**: вход через бота (deep link), привязка Telegram к аккаунту в «Настройки → Аккаунт», отвязка. Старый виджет входа заморожен (`TELEGRAM_LOGIN_ENABLED`, D246).
- **Mini App**: сайт открывается окном внутри Telegram, сессия по `tgWebAppData` (`verifyTelegramInitData`). Включается `TELEGRAM_MINI_APP_ENABLED` (D259).
- **Личные сообщения**: уведомления каталога (`runTelegramDispatch`) и напоминания Spoki (`runReminderDispatch`).
- **Канал Jobs Alert**: пост бота о новой опубликованной вакансии, шаблон без LLM (`runJobsAlert`, D341).
- **Кнопки сервисов**: «Принять»/«Отказать» по заказу фриланса, вход креатора UGC по ссылке `/start`.

## Поток webhook

`POST /api/telegram/webhook` проверяет секрет (`telegramWebhookSecretMatches`, секрет выводится из токена бота) и по очереди отдаёт обновление: `handleFreelanceTelegramCallback` → `handleUgcTelegramStart` → `handleTelegramWebhook` (вход и привязка, модуль auth) → иначе `handleTelegramAgentUpdate` (Spoki, модуль bot). Webhook принадлежит сайту, только если адрес сайта не localhost (`siteOwnsTelegramWebhook`).

## Главные файлы

| Часть                              | Где                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook                            | `src/app/api/telegram/webhook/route.ts`                                                                                               |
| Вход, привязка, Mini App, отправка | `src/modules/auth/service/telegram.ts`, `telegram-login.ts`, `telegram-bot.ts`, `repo/telegram-accounts.ts`, `repo/telegram-login.ts` |
| Spoki в Telegram                   | `src/modules/bot/service/telegram-agent.ts`, напоминания `service/reminders.ts`                                                       |
| Рассылка уведомлений               | `src/modules/notifications/service/telegram-dispatch.ts`                                                                              |
| Канал Jobs Alert                   | `src/modules/jobs/service/jobs-alert.ts`                                                                                              |
| Фриланс и UGC                      | `src/modules/freelance/service/telegram-actions.ts`, `src/modules/ugc/service/telegram-start.ts`                                      |
| Общие помощники                    | `src/lib/telegram-bot.ts`, `telegram-actions.ts`, `telegram-markdown.ts`, `telegram-login-wait.ts`, `telegram-web-app-boot.ts`        |
| Окно Mini App и вход на сайте      | `src/components/auth/**` (D318–D322)                                                                                                  |

## Таблицы и миграции

| Таблица / поле                          | Миграция                          |
| --------------------------------------- | --------------------------------- |
| `telegram_accounts`                     | `0023_telegram_accounts.sql`      |
| отметка отправки уведомления в Telegram | `0025_telegram_notifications.sql` |
| `telegram_login_challenges`             | `0028_telegram_login.sql`         |
| очередь канала у вакансий               | `0033_jobs_alert.sql`             |
| `bot_reminders`                         | `0059_bot_reminders.sql`          |

## Маршруты

- `/api/telegram/webhook`.
- Вход: `/api/auth/telegram`, `/api/auth/telegram/start`, `/api/auth/telegram/pending`, `/api/auth/telegram/link`, `/api/auth/telegram/unlink`, `/api/auth/telegram/miniapp`.
- Cron: `/api/cron/telegram` каждые 5 минут — личная рассылка, напоминания, затем один пост в канал.

## Env (без значений)

`TELEGRAM_BOT_TOKEN`, `JOBS_ALERT_CHAT_ID` (только Vercel production), `TELEGRAM_LOGIN_ENABLED`, `TELEGRAM_MINI_APP_ENABLED`, `CRON_SECRET`.

## ТЗ и решения

ТЗ: [12-bot.md](../tz/12-bot.md), [21-jobs-alert.md](../tz/21-jobs-alert.md). Как работает Spoki — [bot.md](bot.md), вход — [auth.md](auth.md).

D: 217, 230, 246 (виджет), 259 (Mini App), 311–324 (webhook, сессия Mini App), 339 (привязка), 341 (канал), 389, 395 (карточка и интервал канала), 410 (скиллы), 426–429 (вход с телефона), 473 (напоминания).

## Что не сделано

- Вход через Telegram на сайте: старт через бота работает, завершение сессии упирается в Supabase Auth (402, status BROKEN).
- Канал: по OPEN_TASKS короткая карточка D389 (ветка `cursor/jobs-alert-card`) и интервал D395 (локально) не выложены; старые посты (2 выдуманные и 144 импортные не из Jobicy) удаляются только вручную.
- Чат на телефоне в Telegram и Safari проверен только имитацией (D431, D468).
