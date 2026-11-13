# Jobs & applications — как устроено

ТЗ: [../tz/06-api.md](../tz/06-api.md), модель [../tz/04-data.md](../tz/04-data.md).

## Код

- Jobs: `src/modules/jobs/**` — CRUD, publish, expire cron
- Applications: `src/modules/applications/**` — только `transitionApplication()`
- Contacts / reveal: `src/modules/contacts/**` + express-interest (D3)
- Listing/filters: `/api/jobs`, pages `/jobs`, `/jobs/[id]`
- Каталог V2 использует ту же выборку `searchJobs`; число показанных вакансий берётся из `chat.work.summary.jobs` и не зависит от макетных карточек.

Импорт: `src/modules/ingestion/**` + [../tz/13-import.md](../tz/13-import.md), см. [import.md](import.md). Сохранить, скрыть, пожаловаться, сохранённые поиски и подписки — [job-search-tools.md](job-search-tools.md).

## Что делает сервис «Вакансии»

- **jobs** — вакансии от создания до архива. Статусы и переходы — `service/status-machine.ts` (`JOB_TRANSITIONS`): `draft → published`, `published ↔ paused`, `close`, `extend`, модерация (`pending_moderation → published | draft`), `expire`, `remove`. Публичный каталог с фильтрами (`searchJobs`, `toPublicJobDto`), похожие и связанные вакансии, RSS, курсы валют ЕЦБ для зарплат (`refreshFxRates`), оценка риска мошенничества (`scoreJobRisk`: бесплатная почта, шаблоны обмана), размещение с оплатой (`submitHireListing`), общий черновик вакансии сайта и Spoki (`job_drafts`, D494), вакансия команды на тарифе «Команда» в очередь админа (`queueTeamJobBrief`, D411), пост в канал Jobs Alert (`runJobsAlert`, D341).
- **applications** — отклик кандидата и путь по статусам `applied → viewed → shortlisted → interview → offer → hired`, плюс `rejected` и `withdrawn`. Любая смена статуса — только `transitionApplication()` (запрет UPDATE в обход, ТЗ §24). Проверка, можно ли откликнуться (`checkApplyEligibility`: полнота анкеты), кабинет работодателя (`listEmployerApplications`, `openApplication`).
- **contacts** — личные контакты кандидата хранятся отдельно (`candidate_contacts`, D16). Работодатель видит их только на статусах `shortlisted`, `interview`, `offer`, `hired` (`CONTACTS_OPEN_STATUSES`, D23). «Проявить интерес» (`expressInterest`, D3) переводит отклик из `applied` или `viewed` в `shortlisted` и пишет строку `application_reveals`.

## Главные файлы

| Модуль         | Вход                                        | Остальное                                                                                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jobs`         | `src/modules/jobs/service/index.ts`         | `repo/jobs-repo.ts`, `repo/public-search-repo.ts`, `repo/admin-jobs-repo.ts`, `service/status-machine.ts`, `service/public-search.ts`, `service/drafts.ts`, `service/hire-post.ts`, `service/risk-score.ts`, `service/fx-rates.ts`, `service/rss.ts`, `service/jobs-alert.ts`, `service/imported-jobs.ts`, `ui/*.tsx` |
| `applications` | `src/modules/applications/service/index.ts` | `service/transition-application.ts`, `service/transitions.ts`, `service/apply-service.ts`, `service/eligibility.ts`, `service/employer-service.ts`, `service/reveal-service.ts`, `service/reveal-rules.ts`, `repo/applications.ts`                                                                                    |
| `contacts`     | `src/modules/contacts/service/index.ts`     | `service/contacts-service.ts`, `repo/contacts.ts`                                                                                                                                                                                                                                                                     |

## Таблицы и миграции

| Таблица                                                     | Миграция                                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `jobs`, `job_status_history`, `job_skills`, `job_languages` | `0006_jobs.sql`; метки — `0019_markers.sql`, канал — `0033_jobs_alert.sql` |
| `fx_rates`, `import_sources`, `job_sources`                 | `0007_fx_rates_search.sql`                                                 |
| `applications`, `application_status_history`                | `0009_applications.sql`                                                    |
| `application_reveals`                                       | `0012_application_reveals.sql`                                             |
| `candidate_contacts`                                        | `0005_candidate_profiles.sql`                                              |
| `job_drafts`                                                | `0063_job_drafts.sql`                                                      |
| покупки размещения                                          | `0038_billing_hire.sql` (модуль billing)                                   |

Схема: `src/db/schema/jobs.ts`, `applications.ts`, `candidates.ts`, `fx-rates.ts`.

## Маршруты и страницы

- Кандидат: `/jobs`, `/jobs/[id]`, `/jobs/t/[slug]` (тег), `/jobs/rss.xml`, `/jobs/t/[slug]/rss.xml`, `/applications`, `/contacts`, `/post-job`.
- Макет V2 Jobs: `/jobs` сохраняет серверные фильтры и `searchJobs`, а интерфейс каталога показывает список и детали выбранной вакансии в двух панелях (на телефоне — последовательно). Клик по карточке передаёт `selected` query-параметр; «Для меня» и «Сохранённые» ведут на реальные `/matches` и `/saved-jobs`. Save/hide/report в панели используют `JobFeedbackActions` и существующие API; отклик ведёт на детальную страницу.
- Работодатель: `/employer/jobs`, `/employer/jobs/new`, `/employer/jobs/[id]`, `/employer/jobs/[id]/edit`, `/employer/jobs/[id]/applications`, `/employer/jobs/[id]/stats`, `/employer/applications/[id]`.
- API вакансий: `/api/jobs`, `/api/jobs/[id]`, `/api/jobs/[id]/[action]`, `/api/jobs/draft`, `/api/hire`.
- API откликов: `/api/applications`, `/api/applications/[id]`, `/api/applications/[id]/status`, `/api/applications/[id]/withdraw`, `/api/applications/[id]/express-interest`, `/api/applications/[id]/contacts`, `/api/candidates/me/contacts`.
- Cron: `/api/cron/expire-jobs` (каждый час), `/api/cron/job-expiring` (04:10 UTC, письмо «скоро истечёт»), `/api/cron/fx-rates` (16:15 UTC), `/api/cron/telegram` (канал).
- Sitemap: `listSitemapEntries`.

## Env

Своих переменных нет. Канал — `JOBS_ALERT_CHAT_ID` (читает `/api/cron/telegram`), оплата размещения — см. [billing.md](billing.md).

## ТЗ и решения

ТЗ: [06-api.md](../tz/06-api.md), [04-data.md](../tz/04-data.md), [21-jobs-alert.md](../tz/21-jobs-alert.md), [29-spoki-cards.md](../tz/29-spoki-cards.md) (вакансии в Spoki). Сравнение кабинетов — [../JOB_DASHBOARD_BENCHMARK.md](../JOB_DASHBOARD_BENCHMARK.md).

D: 3 (проявить интерес), 15, 16, 23 (когда видны контакты), 27, 75–79, 105, 116, 117 (отклики и контакты), 71, 74, 128, 204, 205, 210, 219, 228, 242, 243, 275, 284, 292 (вакансии и каталог), 341, 389, 395 (канал), 411 (вакансия команды), 494 (черновик), 498 (вакансии работодателя в Spoki), 509.

## Что не сделано

- Кабинеты вакансий: P1.2 (контекст компании для прав и тарифа, D570) и P2 (обзор поиска кандидата, обзор найма по компании, приватные заметки команды) — открыты.
- `/jobs/rss.xml` отвечает 404, лента работает на `/en/jobs/rss.xml`.
