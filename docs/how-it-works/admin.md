# Админка — как устроено

Модули `admin`, `admin-console`, `moderation` и общая часть `src/admin/`. Требования и этапы — [../ADMIN.md](../ADMIN.md). Метрики и аналитика — [analytics.md](analytics.md).

## Что делает

- **`admin-console`** — дом админки (этапы A1–A2 ADMIN.md): отдельный вход на хосте админки с паролем, TOTP или passkey и кодами восстановления; своя сессия (`issueAdminSession`, `revokeAdminSession`), подтверждение перед опасным действием (`confirmStepUp`), «четыре глаза» (`requestFourEyes`, `decideFourEyes`), журнал `writeAdminAudit`. Карточки людей с замаскированной почтой и телефоном; «Показать» — только с причиной (`revealPerson`); заметки, сброс пароля, выход из сессий, блокировка, удаление.
- **`admin`** — списки пользователей и компаний, приостановка и возврат, журнал аудита, предложения навыков (сопоставить или отклонить).
- **`moderation`** — очередь проверки вакансий, компаний, услуг и задач фриланса (`listQueue`, `decideQueueItem`, срок 24 часа — `QUEUE_SLA_MS`), жалобы (`decideReport`; после 3 жалоб вакансия встаёт на паузу — `AUTO_PAUSE_THRESHOLD`), снятие вакансии админом.
- **`src/admin/`** — проверка хоста (`host.ts`), права ролей (`permissions.ts`), политика действий и сессий, реестр разделов (`registry.ts`).

## Главные файлы

| Модуль          | Вход                                         | Остальное                                                                                                                                            |
| --------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-console` | `src/modules/admin-console/service/index.ts` | `service/console-service.ts`, `service/people-service.ts`, `repo/admin-console-repo.ts`, `people-repo.ts`                                            |
| `admin`         | `src/modules/admin/service/index.ts`         | `service/admin-service.ts`, `repo/admin-repo.ts`                                                                                                     |
| `moderation`    | `src/modules/moderation/service/index.ts`    | `service/queue-service.ts`, `service/decide.ts`, `service/reports-service.ts`, `service/admin-jobs.ts`, `repo/queue-repo.ts`, `repo/reports-repo.ts` |
| общее           | `src/admin/`                                 | `host.ts`, `permissions.ts`, `action-policy.ts`, `session-policy.ts`, `registry.ts`                                                                  |

## Таблицы и миграции

| Таблица                                                   | Миграция                         |
| --------------------------------------------------------- | -------------------------------- |
| `audit_logs`, `rate_limit_counters`                       | `0002_audit_and_rate_limits.sql` |
| `moderation_queue`                                        | `0004_companies.sql`             |
| `reports` (+ жалобы фриланса — `0055`)                    | `0011_feedback_reports.sql`      |
| `admin_members`, `admin_sessions`, `admin_recovery_codes` | `0027_admin_core.sql`            |
| `admin_notes`, `admin_approvals`                          | `0029_admin_people.sql`          |

Схема: `src/db/schema/admin-core.ts`, `admin-people.ts`.

## Маршруты и страницы

- Страницы `/admin/…`: главная, `users`, `users/[id]`, `companies`, `companies/[id]`, `jobs`, `jobs/[id]`, `moderation`, `reports`, `import`, `taxonomy`, `briefs`, `campaigns` (UGC), `freelance/[id]`, `engagements`, `metrics`, `audit`, `sessions`, `team`, `flags`, `login`, `mfa`.
- Вход: `/api/admin-auth/login`, `logout`, `mfa/start`, `mfa/verify`, `passkey/options`, `passkey/verify`, `sessions/revoke`.
- Действия: `/api/admin/users` (+ `[id]/suspend`, `unsuspend`, `ban`, `delete`, `notes`, `reset-password`, `reveal`, `signout`), `/api/admin/companies` (+ `[id]/[action]`), `/api/admin/approvals/[id]`, `/api/admin/audit`, `/api/admin/taxonomy/suggestions` (+ `[id]/map`, `[id]/reject`), `/api/admin/queue` (+ `[id]/decide`), `/api/admin/reports` (+ `[id]/decide`), `/api/admin/jobs` (+ `[id]/remove`).

## Env (без значений)

`ADMIN_HOST_ONLY` (админка только на своём хосте), `RESEND_API_KEY`, `EMAIL_FROM` (письма владельцам платформы).

## ТЗ и решения

ТЗ: [../ADMIN.md](../ADMIN.md), [14-moderation.md](../tz/14-moderation.md).

D: 74, 80–82, 84, 132 (модерация и жалобы), 306, 308 (дом админки), 447, 569 (модерация услуг и задач фриланса).

## Что не сделано

- SEC-20261014-1 (Medium): пока `ADMIN_HOST_ONLY` не включён, админка на основном сайте открывается одним паролем, без второго фактора, без проверки прав роли и без step-up. Шаги — RUNBOOK §13, включает основатель.
- SEC-20261014-4 (Low): `mfa/verify` и `passkey/verify` не вызывают `assertAdminLoginOpen` до проверки кода.
- Этап A4 ADMIN.md (планировщик `/api/cron/tick`, `scheduled_jobs`) в коде не найден: такого маршрута и таблицы нет. Состояние этапов A3, A5–A7 по коду этой страницей не проверялось.
