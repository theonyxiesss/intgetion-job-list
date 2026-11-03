# Импорт вакансий — как устроено

Модуль `src/modules/ingestion`. Скилл: `.claude/skills/intgetion-import/` (D416). Импорт событий — отдельно, [events.md](events.md).

## Что делает

Крон забирает вакансии из открытых источников без ключей и входа: Remotive, Himalayas, Jobicy, Remote OK и карьерные страницы компаний на Greenhouse, Lever и Ashby (каждая компания — свой источник). Вакансия приводится к нашей форме (`normalize.ts`; описание — безопасный Markdown до 8000 знаков, D591), дубли отсекаются (`dedup.ts`), запись идёт через вход модуля jobs (`saveImportedJob`). Отклик на импортную вакансию — переход на сайт источника с отметкой (`applyExternal`). Каждый прогон записан в `import_runs`.

Живой импорт идёт только при `IMPORT_LIVE_ENABLED=true` (D18, D375). Без флага работают фикстуры, и только при базе на `localhost` (`fixture-guard.ts`). Какие источники можно отдавать дальше (канал, RSS, MCP) — `SYNDICATED_IMPORT_SOURCES` в `src/config/import-sources.ts` (сейчас только Jobicy, D484).

## Главные файлы

| Что                        | Где                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Вход                       | `src/modules/ingestion/service/index.ts`                                                                                                        |
| Прогоны, список источников | `service/ingest-fixtures.ts` (`LIVE_SOURCES`, `runLiveImports`, `runFixtureImports`)                                                            |
| Адаптеры                   | `adapters/remotive.ts`, `himalayas.ts`, `jobicy.ts`, `remoteok.ts`, `company-boards.ts`, `live.ts`; фикстуры `api-fixture.ts`, `rss-fixture.ts` |
| Приведение и дубли         | `service/normalize.ts`, `service/dedup.ts`                                                                                                      |
| Журнал прогонов            | `service/run-ledger.ts`, `repo/import-repo.ts`                                                                                                  |
| Отклик на сайте источника  | `service/apply-external.ts`                                                                                                                     |
| Админка                    | `repo/admin-import-repo.ts`                                                                                                                     |
| Условия источников         | `src/config/import-sources.ts`                                                                                                                  |

## Таблицы и миграции

| Таблица                                                      | Миграция                              |
| ------------------------------------------------------------ | ------------------------------------- |
| `import_sources`, `job_sources` (и `fx_rates`)               | `0007_fx_rates_search.sql`            |
| `import_runs`                                                | `0008_import_runs.sql`                |
| `jobs`, `companies` (импортные строки с `origin = imported`) | `0006_jobs.sql`, `0004_companies.sql` |

Схема: `src/db/schema/import-runs.ts`, `import-sources.ts`.

## Маршруты и страницы

- Cron: `/api/cron/import` каждые 10 минут.
- API: `/api/jobs/[id]/apply-external`, `/api/admin/import/runs`, `/api/admin/import/sources`.
- Админка: `/admin/import`.

## Env

`IMPORT_LIVE_ENABLED`, `DATABASE_URL` (проверка «база локальная» для фикстур), `CRON_SECRET`.

## ТЗ и решения

ТЗ: [13-import.md](../tz/13-import.md). Снимок данных в облаке — заметка памяти агента «Imported jobs snapshot».

D: 18 (живой импорт по флагу), 70–72, 83, 211, 338, 375, 412 (чистка выдуманных и возврат окна), 416 (скилл и источники с ключами), 484 (что отдавать в MCP), 591 (Markdown).

## Что не сделано

- Источники с ключами (Adzuna, Reed, USAJobs, hh.ru, D416) одобрены, код не начат — ждут регистрации основателя.
- По OPEN_TASKS `/jobs/rss.xml` отвечает 404, лента работает на `/en/jobs/rss.xml`.
- Наблюдение после D412 (у каждого прогона есть `finished_at`, у каждого источника успешный прогон за сутки) в OPEN_TASKS не закрыто.
