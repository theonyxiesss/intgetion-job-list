# Уведомления — как устроено

Модуль `src/modules/notifications`. Утренние сводки агента — отдельная страница [morning-briefs.md](morning-briefs.md).

## Что делает

- Один каталог событий (`lib/catalog.ts`): тип, кому, каналы, схема данных. Каналы — на сайте (in-app), почта, Telegram.
- `notify` / `safeNotify` проверяют данные по схеме типа и по настройкам человека пишут строку `notifications` (на сайте) и письмо в очередь `notification_emails`. Отправка идёт отдельно: почта — кроном `runNotificationCron` (через Resend, `dispatchEmails`), Telegram — `runTelegramDispatch` из `/api/cron/telegram`. Если `RESEND_API_KEY` или `EMAIL_FROM` пусты, письма не уходят (`noopEmailSender`).
- Настройки человека — `notification_preferences` (галочки на `/notifications` и `/settings/notifications`). Отписка по подписанной ссылке (`signUnsubscribe`, `unsubscribeByToken`).
- Отклики работодателю собираются в пачку за час (`groupHourlyBatch`). Дайджест подборки — `pickDigestJobs`, не чаще правила `shouldSendDigest`.
- Утренние сводки кандидатам и компаниям: `runMorningBriefsCron`, `employerBriefPayload`; админка слотов — `readBriefsAdmin`, `updateBriefSlot`, `runBriefSlotNow`.
- Письма Supabase Auth — другой домен типов (`AUTH_EMAIL_TYPES`), их шлёт хук `send-email` модуля auth.

## Главные файлы

| Что                                                | Где                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Вход                                               | `src/modules/notifications/service/index.ts`                                                                                                  |
| Каталог, пачки, дайджест, отписка (чистые правила) | `lib/catalog.ts`, `lib/batch.ts`, `lib/digest.ts`, `lib/unsubscribe.ts`, `lib/briefs.ts`, `lib/employer-briefs.ts`                            |
| Запись события                                     | `service/notify.ts`                                                                                                                           |
| Лента и настройки                                  | `service/inbox.ts`, `repo/notifications.ts`                                                                                                   |
| Почта                                              | `service/dispatch.ts`, `service/email-sender.ts`, `service/render.ts`, `service/batch-mail.ts`; макет письма — `src/lib/email-html.ts` (D330) |
| Telegram                                           | `service/telegram-dispatch.ts`                                                                                                                |
| Сводки                                             | `service/morning-briefs.ts`, `service/employer-briefs.ts`, `service/brief-intro.ts`, `service/briefs-admin.ts`, `service/deliver.ts`          |
| Дайджест                                           | `service/digest.ts`                                                                                                                           |

## Таблицы и миграции

| Таблица                                                            | Миграция                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `notifications`, `notification_preferences`, `notification_emails` | `0013_notifications.sql`; отметка Telegram — `0025_telegram_notifications.sql` |
| `brief_settings`, `brief_slots`, `brief_runs`, `brief_deliveries`  | `0032_morning_briefs.sql`; компании — `0036`, `0037`                           |

Схема: `src/db/schema/notifications.ts`, `briefs.ts`.

## Маршруты и страницы

- Страницы: `/notifications`, `/settings/notifications`, `/unsubscribe`; админка `/admin/briefs`; превью писем `/dev-emails/[file]` (только dev).
- API: `/api/notifications`, `/api/notifications/read`, `/api/notifications/preferences`, `/api/notifications/unsubscribe`, `/api/notifications/agent-briefs`, `/api/notifications/company-agent-briefs`, `/api/admin/briefs/settings`, `/api/admin/briefs/slots/[id]` (+ `run`).
- Cron: `/api/cron/notifications` (5 минут каждого часа), `/api/cron/morning-briefs` (каждые 15 минут), `/api/cron/telegram` (каждые 5 минут), `/api/cron/job-expiring` (04:10 UTC).

## Env (без значений)

`RESEND_API_KEY`, `EMAIL_FROM`, `UNSUBSCRIBE_SECRET`, `NEXT_PUBLIC_SITE_URL`. Telegram — `TELEGRAM_BOT_TOKEN` (через модуль auth).

## ТЗ и решения

ТЗ: [15-notifications.md](../tz/15-notifications.md), [20-morning-briefs.md](../tz/20-morning-briefs.md).

D: 100–103, 125–127 (каталог, пачки), 166, 186–188, 234, 236, 237 (Telegram-рассылка), 240, 330 (макет писем), 340 (сводки), 349 (галочка почты), 368–370, 456 (заказы фриланса), 457 (UGC), 569 (задачи фриланса).

## Что не сделано

- Уведомления о новом сообщении в комнате заказа фриланса — в хвостах D566.
- Доставка почты на production при квоте Supabase Auth (402) не перепроверялась для писем входа; письма каталога идут через Resend отдельно.
