# How it works

Факт в коде (не ТЗ). Читать файл домена после `tz/*`.

| Файл                                         | Зона                       | Код (вход)                                            |
| -------------------------------------------- | -------------------------- | ----------------------------------------------------- |
| [auth.md](auth.md)                           | Auth, callback, письма     | `src/modules/auth`, `src/app/api/auth`, Supabase      |
| [deploy.md](deploy.md)                       | Vercel / Supabase / Resend | [../RUNBOOK.md](../RUNBOOK.md)                        |
| [bot.md](bot.md)                             | Web chat + Telegram        | `src/modules/bot`, `src/app/api/bot`                  |
| [matching.md](matching.md)                   | Скор и `/matches`          | `src/modules/matching`                                |
| [morning-briefs.md](morning-briefs.md)       | Утренние сводки, 3 слота   | `src/modules/notifications/service/morning-briefs.ts` |
| [jobs-applications.md](jobs-applications.md) | Вакансии и отклики         | `src/modules/jobs`, `applications`                    |
| [events.md](events.md)                       | События Web3 и IT (D435)   | `src/modules/events`, `src/app/[locale]/events`       |
| [mcp.md](mcp.md)                             | MCP для ИИ-ассистентов     | `src/modules/mcp`, `src/app/api/mcp`                  |
| [freelance.md](freelance.md)                 | Фриланс-услуги и заказы    | `src/modules/freelance`                               |
| [freelance-tasks.md](freelance-tasks.md)     | Задачи фриланса и отклики  | `src/modules/freelance` (task-\*)                     |
| [ugc.md](ugc.md)                             | UGC-видео                  | `src/modules/ugc`                                     |
| [billing.md](billing.md)                     | Оплата с кошелька          | `src/modules/billing`, `src/lib/billing`              |
| [account.md](account.md)                     | Один аккаунт, анкета       | `src/modules/users`, `candidates`, `privacy`          |
| [companies.md](companies.md)                 | Компании и проверка        | `src/modules/companies`                               |
| [notifications.md](notifications.md)         | Уведомления                | `src/modules/notifications`                           |
| [telegram.md](telegram.md)                   | Бот, вход, Mini App, канал | `src/app/api/telegram`, части модулей                 |
| [import.md](import.md)                       | Импорт вакансий            | `src/modules/ingestion`                               |
| [admin.md](admin.md)                         | Админка и модерация        | `src/modules/admin*`, `moderation`, `src/admin`       |
| [analytics.md](analytics.md)                 | Счётчик и метрики          | `src/modules/analytics`, `metrics`                    |
| [seo.md](seo.md)                             | SEO и зарплаты             | `src/modules/seo`, `salaries`                         |
| [taxonomy.md](taxonomy.md)                   | Навыки                     | `src/modules/taxonomy`                                |
| [job-search-tools.md](job-search-tools.md)   | Сохранить, скрыть, поиски  | `src/modules/feedback`, `saved-searches`, `follows`   |

## Сервисы для пользователя

| Сервис          | Страница                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Вакансии        | [jobs-applications.md](jobs-applications.md), [job-search-tools.md](job-search-tools.md), [matching.md](matching.md) |
| Фриланс         | [freelance.md](freelance.md)                                                                                         |
| Задачи фриланса | [freelance-tasks.md](freelance-tasks.md)                                                                             |
| UGC             | [ugc.md](ugc.md)                                                                                                     |
| События         | [events.md](events.md)                                                                                               |
| Spoki           | [bot.md](bot.md)                                                                                                     |
| Оплата          | [billing.md](billing.md)                                                                                             |
| Аккаунт         | [account.md](account.md), вход — [auth.md](auth.md)                                                                  |
| Компании        | [companies.md](companies.md)                                                                                         |
| Уведомления     | [notifications.md](notifications.md), [morning-briefs.md](morning-briefs.md)                                         |
| Telegram        | [telegram.md](telegram.md)                                                                                           |
| Импорт          | [import.md](import.md)                                                                                               |
| Админка         | [admin.md](admin.md), [analytics.md](analytics.md)                                                                   |
| MCP             | [mcp.md](mcp.md)                                                                                                     |

## Модули `src/modules/` → страница

| Модуль           | Страница                                                               |
| ---------------- | ---------------------------------------------------------------------- |
| `admin`          | [admin.md](admin.md)                                                   |
| `admin-console`  | [admin.md](admin.md)                                                   |
| `analytics`      | [analytics.md](analytics.md)                                           |
| `applications`   | [jobs-applications.md](jobs-applications.md)                           |
| `auth`           | [auth.md](auth.md)                                                     |
| `billing`        | [billing.md](billing.md)                                               |
| `bot`            | [bot.md](bot.md)                                                       |
| `candidates`     | [account.md](account.md)                                               |
| `companies`      | [companies.md](companies.md)                                           |
| `contacts`       | [jobs-applications.md](jobs-applications.md)                           |
| `events`         | [events.md](events.md)                                                 |
| `feedback`       | [job-search-tools.md](job-search-tools.md)                             |
| `follows`        | [job-search-tools.md](job-search-tools.md)                             |
| `freelance`      | [freelance.md](freelance.md), [freelance-tasks.md](freelance-tasks.md) |
| `ingestion`      | [import.md](import.md)                                                 |
| `jobs`           | [jobs-applications.md](jobs-applications.md)                           |
| `matching`       | [matching.md](matching.md)                                             |
| `mcp`            | [mcp.md](mcp.md)                                                       |
| `metrics`        | [analytics.md](analytics.md)                                           |
| `moderation`     | [admin.md](admin.md)                                                   |
| `notifications`  | [notifications.md](notifications.md)                                   |
| `privacy`        | [account.md](account.md)                                               |
| `salaries`       | [seo.md](seo.md)                                                       |
| `saved-searches` | [job-search-tools.md](job-search-tools.md)                             |
| `seo`            | [seo.md](seo.md)                                                       |
| `taxonomy`       | [taxonomy.md](taxonomy.md)                                             |
| `ugc`            | [ugc.md](ugc.md)                                                       |
| `users`          | [account.md](account.md)                                               |

На каждой странице: что делает, главные файлы (вход `service/index.ts`), таблицы и миграции, маршруты, env без значений, ТЗ и D, что не сделано. Статусы на облаке взяты из `MISSION_LOG.md` и `OPEN_TASKS.md` на 2026-11-04.

Статус работы: [../status/INDEX.md](../status/INDEX.md).
