# ТЗ, часть 2 (модули jobs и ingestion): лёгкое сохранение импорта и проверка жизни импортированных вакансий

> **Для исполнителя-агента:** обязательный навык — superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans. Шаги отмечаются чекбоксами (`- [ ]`).

**Цель:** вакансия, подтверждённо закрытая на внешней площадке, перестаёт быть опубликованной не позже чем через 24 часа, а ошибки и блокировки внешних сайтов никогда не закрывают вакансию. Логика сохранения импорта из PR #58 переезжает к своему владельцу — модулю `jobs`.

**Архитектура:** в `intgetion-ingestion` два новых фоновых процесса. (1) Ежедневная проверка списков «полных» источников (доски компаний, `feed: "full"`): скачать список и закрыть пропавшие — без записи вакансий. (2) Обход по одной вакансии для «оконных» источников (`feed: "window"`: Remotive, Himalayas, Jobicy, RemoteOK), где отсутствие в ленте ничего не значит: запрос по ссылке вакансии, закрытие только по 404/410. Результат последней проверки хранится в `job_sources`. Закрытие идёт через существующий `expireImportedJobs(ids, reason)` из `@intgetion/jobs` с причиной `closed_at_source`.

**Стек:** TypeScript, Drizzle, postgres.js, Vitest; модули подключаются через теги GitHub (`github:theonyxiesss/intgetion-jobs#vX.Y.Z`).

**Стратегия:** `docs/superpowers/specs/2026-11-27-db-egress-strategy-design.md`, раздел 5.4 (в репозитории платформы).

## Общие ограничения

- Работа только в репозиториях `C:\Users\Admin\Documents\intgetion-jobs` и `C:\Users\Admin\Documents\intgetion-ingestion`, каждая задача — в ветке от `main`. Платформа не меняется: до сайта это доходит при подключении модулей (отдельный проект).
- Закрытием считается только: HTTP 404 или 410 по ссылке вакансии, или отсутствие вакансии в полном списке «полного» источника, который скачан успешно и не пуст. Всё остальное (403, 429, 5xx, тайм-аут, сетевой сбой, редирект на другой хост, пустой список «полного» источника) — `unknown`, вакансия остаётся опубликованной.
- Каждая опубликованная импортированная вакансия проверяется не реже раза в 24 часа.
- Не больше 2 одновременных запросов к одному хосту; тайм-аут запроса 10 секунд; заголовок `User-Agent: IntgetionLinkCheck/1.0 (+https://intgetion.com)`.
- Миграции проверяются локально; на облачную базу — только в согласованном выпуске по «да» владельца.
- Фоновая проверка по нажатию «Откликнуться» — не в этой части.
- Коммиты от имени `Mark Evans`, без `Co-Authored-By` и `Generated with Claude Code`. Без push без «да» владельца.

## Фокус ревью

1. Внешний сайт отвечает 403/429/503 или не отвечает → вакансия не закрывается, результат `unknown`, следующая попытка позже (Задача 4).
2. «Полный» источник вернул пустой список или упал → ни одна его вакансия не закрывается (Задача 3).
3. Ссылка редиректит на страницу-заглушку другого хоста → `unknown`, не `live` и не `closed` (Задача 4).
4. Вакансию закрыли вручную модерацией до проверки → проверка её не трогает: в обход попадают только `status = 'published'` (Задачи 3, 4).
5. Обход прерван по бюджету времени → уже проверенные сохранены, остальные пойдут первыми в следующий раз (Задача 4).

---

### Задача 1 (intgetion-jobs): лёгкое сохранение импортированной вакансии

**Файлы:**

- Изменить: `src/modules/jobs/service/imported-jobs.ts` (функция `saveImportedJob`, строка ~100)
- Тест: `src/modules/jobs/__tests__/imported-jobs.test.ts` (или существующий тест `saveImportedJob`), интеграционный рядом

**Интерфейсы:**

- Даёт: `saveImportedJob(input: ImportedJobWrite): Promise<{ id: string; status: JobStatus }>` (сужение возвращаемого типа, как в платформе после PR #58); `expireImportedJobs(jobIds: string[], reason?: string)` — без изменений.

Поведение — как в коммите платформы `897a4330` (PR #58): прежняя строка читается без `description` и `fts` (описание сравнивается по `md5`); если содержимое, статус и набор навыков не изменились — запись не выполняется; `returning` только `id` и `status`. Переносится сюда как владельцу логики; копия платформы остаётся до подключения модуля.

- [ ] **Шаг 1: Падающие тесты:** повторное сохранение той же вакансии не меняет `updated_at` и не пишет историю статусов; изменение описания на один символ — пишет; изменение набора навыков при том же тексте — пишет; возвращаемое значение содержит ровно ключи `id`, `status`.
- [ ] **Шаг 2:** `npm test` → FAIL.
- [ ] **Шаг 3:** реализовать.
- [ ] **Шаг 4:** `npm test`, `npm run typecheck` → PASS (интеграционные — с локальной `DATABASE_URL`).
- [ ] **Шаг 5:** коммит `Skip rewriting unchanged imported jobs and read only light columns`; версия в `package.json` → `0.1.3`; тег `v0.1.3` (без push до «да»).

### Задача 2 (intgetion-ingestion): хранение результата проверки

**Файлы:**

- Создать: `migrations/0002_source_checks.sql`
- Изменить: `src/db/owned.ts:33` (`jobSources`), `package.json` (`@intgetion/jobs` → `#v0.1.3`)
- Удалить: локальную ветку `fix/skip-fresh-known-jobs` (заменена Задачей 1)
- Тест: `src/modules/ingestion/source-checks.integration.test.ts`

**Интерфейсы:**

- Даёт колонки `job_sources`: `last_checked_at timestamptz null`, `last_check_result text null check (last_check_result in ('live','closed','unknown'))`, `last_check_note text null` (код ответа или причина, до 200 символов); индекс `job_sources_check_due_idx on (last_checked_at nulls first)`. В Drizzle: `lastCheckedAt`, `lastCheckResult`, `lastCheckNote`.
- Тип: `type CheckResult = "live" | "closed" | "unknown"` в `src/modules/ingestion/service/liveness-rules.ts`.

- [ ] **Шаг 1:** `git switch main`, `git branch -D fix/skip-fresh-known-jobs`, новая ветка `feat/source-liveness`.
- [ ] **Шаг 2: Падающий тест:** после `npm run migrate` на локальной базе вставка строки `job_sources` с `last_check_result = 'gone'` падает по check; с `'closed'` — проходит; повторный `npm run migrate` — без ошибок (идемпотентность, как `0001`).
- [ ] **Шаг 3:** миграция (`alter table ... add column if not exists`, `create index if not exists`), колонки в `owned.ts`, обновить `test/sql`, если там собирается схема.
- [ ] **Шаг 4:** тест и `npm run typecheck` → PASS.
- [ ] **Шаг 5:** коммит `Store the last source liveness check per job source`.

### Задача 3 (intgetion-ingestion): ежедневная проверка «полных» источников

**Файлы:**

- Создать: `src/modules/ingestion/service/full-source-check.ts`
- Изменить: `src/modules/ingestion/repo/import-repo.ts` (новая функция записи результата), `src/modules/ingestion/service/index.ts` (экспорт)
- Тест: `src/modules/ingestion/__tests__/full-source-check.test.ts`

**Интерфейсы:**

- Потребляет: `LIVE_SOURCES` (`ingest-fixtures.ts:38`), существующие `touchSourceRows`, `findLinkedJobIds`, `sourceRowsNotSeenSince`/логику `expireMissing` (`ingest-fixtures.ts:388`), `expireImportedJobs` из `../../../platform`.
- Даёт:
  - `markChecked(sourceId: string, externalIds: readonly string[], result: CheckResult, note: string | null, at: Date): Promise<void>` в `import-repo.ts`.
  - `runFullSourceChecks(input?: { now?: Date; sources?: readonly LiveSource[]; fetchImpl?: typeof fetch; maxAgeMs?: number }): Promise<{ checked: number; closed: number; skipped: number; failed: number }>` — для каждого источника с `feed === "full"`, у которого последняя успешная проверка или импорт старше `maxAgeMs` (по умолчанию 20 часов): скачать список; если список пуст или запрос упал — `failed += 1`, ничего не закрывать; иначе отметить перечисленные как `live`, опубликованные этого источника, которых нет в списке, — `closed`, и вызвать `expireImportedJobs(ids, "closed_at_source")`. Вакансии не сохраняются и не обновляются.

- [ ] **Шаг 1: Падающие тесты** (fetch и repo замоканы):
  - список `[a, b]`, опубликованы `a, b, c` → `expireImportedJobs(["job-c"], "closed_at_source")`, `a, b` отмечены `live`, `c` — `closed`.
  - список пуст → `expireImportedJobs` не вызван, `failed: 1`.
  - fetch бросает → `expireImportedJobs` не вызван, `failed: 1`.
  - источник с `feed: "window"` пропущен.
  - источник, проверенный 2 часа назад, пропущен (`skipped`).
- [ ] **Шаг 2:** `npm test` → FAIL.
- [ ] **Шаг 3:** реализовать. Источник «пора проверять», если и последний успешный импорт (`finishedRunsSince` / `import_runs`), и самая свежая `job_sources.last_checked_at` его строк старше `maxAgeMs`. Проверка не пишет в `import_runs` и `import_sources`, чтобы не сбивать очередь импорта.
- [ ] **Шаг 4:** `npm test` → PASS.
- [ ] **Шаг 5:** коммит `Check full company boards daily and close jobs gone from them`.

### Задача 4 (intgetion-ingestion): обход по ссылкам для «оконных» источников

**Файлы:**

- Создать: `src/modules/ingestion/service/liveness-rules.ts`, `src/modules/ingestion/service/liveness-sweep.ts`
- Изменить: `src/modules/ingestion/repo/import-repo.ts` (выборка очереди), `src/modules/ingestion/service/index.ts`
- Тест: `src/modules/ingestion/__tests__/liveness-rules.test.ts`, `src/modules/ingestion/__tests__/liveness-sweep.test.ts`

**Интерфейсы:**

- Даёт (`liveness-rules.ts`):
  - `classifyProbe(input: { requestedUrl: string; finalUrl: string | null; status: number | null; error: string | null }): { result: CheckResult; note: string }` — `404`/`410` → `closed`; `200–299` на том же хосте, что `requestedUrl` → `live`; `2xx` на другом хосте → `unknown` (`redirect_other_host`); всё остальное, `status === null`, `error !== null` → `unknown` с кодом/ошибкой в `note`.
  - Константы: `PROBE_TIMEOUT_MS = 10_000`, `PER_HOST_CONCURRENCY = 2`, `SWEEP_BATCH = 150`, `SWEEP_BUDGET_MS = 200_000`, `PROBE_USER_AGENT = "IntgetionLinkCheck/1.0 (+https://intgetion.com)"`.
- Даёт (`import-repo.ts`): `dueWindowChecks(sourceIds: readonly string[], limit: number): Promise<{ jobId: string; sourceId: string; externalId: string; sourceUrl: string }[]>` — опубликованные импортированные вакансии этих источников, по `last_checked_at nulls first`, затем по старшинству.
- Даёт (`liveness-sweep.ts`): `runLivenessSweep(input?: { now?: Date; fetchImpl?: typeof fetch; clock?: () => number; batch?: number; budgetMs?: number }): Promise<{ probed: number; live: number; closed: number; unknown: number; partial: boolean }>` — берёт `dueWindowChecks` для источников `feed === "window"`, запрашивает `sourceUrl` методом `GET` с `redirect: "follow"` (тело не читать дальше заголовков), классифицирует, пишет `markChecked`, закрытые — одним вызовом `expireImportedJobs(ids, "closed_at_source")` в конце; при исчерпании `budgetMs` — `partial: true`, уже проверенные сохранены.

Расчёт покрытия: запуск каждые 15 минут × 150 = 14 400 проверок в сутки ≥ ~13 000 опубликованных импортированных. Частоту запуска задаёт платформа при подключении; в README модуля указать «каждые 15 минут».

- [ ] **Шаг 1: Падающие тесты `classifyProbe`:** `404` → closed; `410` → closed; `200` тот же хост → live; `200` другой хост → unknown/`redirect_other_host`; `403`, `429`, `503` → unknown; `status: null, error: "timeout"` → unknown/`timeout`.
- [ ] **Шаг 2: Падающие тесты `runLivenessSweep`** (fetch замокан): 3 вакансии — 404, 200, тайм-аут → `expireImportedJobs` вызван один раз с одним id и причиной `closed_at_source`; `markChecked` вызван с `closed`, `live`, `unknown`; при `clock`, превышающем бюджет после первой вакансии, — `partial: true`, `probed: 1`; одновременно к одному хосту не больше 2 запросов (счётчик в моке fetch).
- [ ] **Шаг 3:** `npm test` → FAIL.
- [ ] **Шаг 4:** реализовать (ограничение по хосту — простая очередь на `Map<host, number>`, без новых зависимостей).
- [ ] **Шаг 5:** `npm test`, `npm run typecheck` → PASS.
- [ ] **Шаг 6:** README модуля: раздел «Проверка жизни вакансий» — два процесса, правила закрытия, рекомендуемые расписания (`runFullSourceChecks` раз в сутки, `runLivenessSweep` каждые 15 минут), миграция `0002`.
- [ ] **Шаг 7:** коммит `Sweep window-feed jobs by URL and close only on 404 or 410`; версия `0.2.0`, тег `v0.2.0` (без push до «да»).

---

## После части 2

- Подключение модулей `jobs` и `ingestion` к платформе — отдельный проект; при нём платформа заводит два cron-маршрута и применяет миграцию `0002` по «да» владельца.
- Фоновая проверка по нажатию «Откликнуться» — отдельное улучшение (возможно, своя очередь и миграция).
