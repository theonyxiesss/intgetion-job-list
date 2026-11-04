# Инструменты поиска работы — как устроено

Три небольших модуля для кандидата: `feedback` (сохранить, скрыть, пожаловаться, отметить отклик на чужом сайте), `saved-searches` (сохранённые поиски с письмами) и `follows` (подписка на компанию). Сами вакансии — [jobs-applications.md](jobs-applications.md).

## Что делает

- **feedback**: сохранить вакансию и убрать из сохранённых, скрыть вакансию или всю компанию (`hideJobForUser`, `HideScope`), пожаловаться (`reportJobForUser`; общий `fileReport` используют и услуги, и заказы фриланса, D462), записать событие `user_job_feedback` (`recordJobFeedback`, `recordAppliedExternal`). Скрытое не показывается в выдаче (`getHiddenSetsForViewer`). Эти события учитывает подбор ([matching.md](matching.md)).
- **saved-searches**: до 10 сохранённых поисков (`SAVED_SEARCH_LIMIT`), у каждого можно включить оповещение. Крон раз в день шлёт новые вакансии по поиску (до 10, `ALERT_MAX_JOBS`); слот занимается в той же транзакции, что и уведомление, поэтому повторный прогон не шлёт дважды.
- **follows**: подписка на компанию, до 50 (`FOLLOW_LIMIT`). Тот же крон шлёт по одному уведомлению на компанию со свежими вакансиями (`runCompanyAlerts`). Число подписчиков видно работодателю в статистике вакансии.

## Главные файлы

| Модуль           | Вход                                          | Остальное                                                                                                                |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `feedback`       | `src/modules/feedback/service/index.ts`       | `rules.ts`, `repo/feedback-repo.ts`, `ui/job-feedback-actions.tsx`, `ui/external-apply-link.tsx`, `ui/unsave-button.tsx` |
| `saved-searches` | `src/modules/saved-searches/service/index.ts` | `service/saved-searches-service.ts`, `repo/saved-searches.ts`, `ui/save-search-button.tsx`, `ui/saved-search-list.tsx`   |
| `follows`        | `src/modules/follows/service/index.ts`        | `service/follows-service.ts`, `repo/follows.ts`, `ui/follow-button.tsx`, `ui/follow-list.tsx`                            |

## Таблицы и миграции

| Таблица                                      | Миграция                    |
| -------------------------------------------- | --------------------------- |
| `saved_jobs`, `user_job_feedback`, `reports` | `0011_feedback_reports.sql` |
| `saved_searches`                             | `0024_saved_searches.sql`   |
| `company_follows`                            | `0026_company_follows.sql`  |

`saved_searches` и `company_follows` читаются SQL из `repo/`, в схеме Drizzle их нет.

## Маршруты и страницы

- Страницы: `/saved-jobs`, `/saved-searches` (там же список подписок на компании), кнопки на `/jobs`, `/jobs/[id]`, `/jobs/t/[slug]`, `/companies/[slug]`.
- API: `/api/jobs/[id]/save`, `/api/jobs/[id]/hide`, `/api/jobs/[id]/report`, `/api/jobs/[id]/apply-external`, `/api/saved-searches`, `/api/saved-searches/[id]`, `/api/companies/[identifier]/follow`.
- Cron: `/api/cron/search-alerts` в 07:00 UTC — `runSearchAlerts` и `runCompanyAlerts`.

## Env

Своих переменных нет.

## ТЗ и решения

ТЗ: [04-data.md](../tz/04-data.md) §4.1 (события отклика), [15-notifications.md](../tz/15-notifications.md).

D: 72, 110, 111, 113 (сохранение, скрытие, жалобы), 233, 234 (сохранённые поиски), 239, 240 (подписка на компанию), 462 (общие жалобы фриланса).

## Что не сделано

Открытых задач по этим модулям в `OPEN_TASKS.md` нет.
