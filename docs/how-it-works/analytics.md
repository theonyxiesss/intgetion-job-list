# Аналитика и метрики — как устроено

Модули `src/modules/analytics` (свой счётчик посещений) и `src/modules/metrics` (сводка для админки). Оба видны в `/admin/metrics`.

## Что делает

- **analytics**: браузер шлёт маячок на `/api/a`, сервер пишет просмотр страницы и то, что из него следует (просмотр вакансии, поиск); ботов и чужие адреса отбрасывает (`trackPageView`). Серверные события — `trackServerEvent` (регистрация, отклик). Посетитель — cookie `VISITOR_COOKIE`, идентификаторы хэшируются секретом (`PRIVACY_HASH_SECRET`). Человек может стереть свой след (`forgetVisitor`, `/api/a/forget`). Отчёты: `analyticsReport`, `trafficReport` (админка), `jobViews` (статистика вакансии у работодателя). Старые строки чистит `purgeAnalytics` из ежечасной чистки модуля privacy.
- **metrics**: `getMetrics` — счётчики пользователей, вакансий, откликов, подборов и писем; `envStatus` — какие настройки production заданы (только имя и режим, значение никогда, D229).

## Главные файлы

| Модуль      | Вход                                     | Остальное                                                                                                                                       |
| ----------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `analytics` | `src/modules/analytics/service/index.ts` | `service/analytics-service.ts`, `repo/analytics-repo.ts`, `lib/events.ts`, `lib/channel.ts`, `ui/analytics-report.tsx`, `ui/traffic-report.tsx` |
| `metrics`   | `src/modules/metrics/service/index.ts`   | `service/metrics-service.ts`, `service/env-status.ts`, `repo/metrics-repo.ts`, `ui/env-status.tsx`                                              |

## Таблицы и миграции

| Таблица                                                                                          | Миграция                    |
| ------------------------------------------------------------------------------------------------ | --------------------------- |
| `analytics_events`                                                                               | `0022_analytics_events.sql` |
| metrics только читает `users`, `jobs`, `applications`, `matching_results`, `notification_emails` | —                           |

## Маршруты и страницы

- API: `POST /api/a`, `/api/a/forget`, `/api/admin/metrics`; события пишут также `/api/auth/register` и `/api/applications`.
- Страницы: `/admin/metrics`, `/employer/jobs/[id]/stats`.

## Env

analytics: `PRIVACY_HASH_SECRET`, `NEXT_PUBLIC_SITE_URL`. metrics (`envStatus`) показывает, заданы ли `DATABASE_URL` (и режим пулера), `NEXT_PUBLIC_SITE_URL`, ключ Supabase admin, `RESEND_API_KEY` с `EMAIL_FROM`, `TELEGRAM_BOT_TOKEN` (и заморожен ли вход через виджет), ключ LLM, секреты и `SENTRY_DSN` — значения секретов не показывает.

## ТЗ и решения

ТЗ: [18-ops.md](../tz/18-ops.md), [../ADMIN.md](../ADMIN.md) §6.2 и §6.12, приватность — [17-gdpr.md](../tz/17-gdpr.md).

D: 225–227, 232, 247, 293 (свой счётчик), 229 (статус env), 335.

## Что не сделано

Открытых задач по этим модулям в `OPEN_TASKS.md` нет. Алерты на почту и в Telegram (этап A3 ADMIN.md) этой страницей по коду не проверялись.
