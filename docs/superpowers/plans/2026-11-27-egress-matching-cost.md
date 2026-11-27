# ТЗ, часть 3 (модуль matching): стоимость пересчёта личного подбора

> **Для исполнителя-агента:** обязательный навык — superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans. Шаги отмечаются чекбоксами (`- [ ]`).

**Цель:** пересчёт личных рекомендаций читает из базы только нужное и запускается по понятным поводам, а не каждые 6 часов при открытии ленты; стоимость пересчёта видна в цифрах.

**Архитектура:** в `intgetion-matching` три изменения. (1) Лёгкие выборки: `readJobs` без `description`/`fts` (как PR #58 в платформе), `readStoredMatches` без полного `breakdown`. (2) Счётчики стоимости, которые возвращают `computeMatches` и `computeMatchesForJob`. (3) Срок свежести кэша результатов — 24 часа вместо 6: новые вакансии и так дописываются в результаты всех подходящих кандидатов через очередь `matching_jobs` → `computeMatchesForJob` → `writeJobResults`, а изменение анкеты уже сбрасывает кэш по `profileUpdatedAt`.

**Стек:** TypeScript, Drizzle, Vitest.

**Стратегия:** `docs/superpowers/specs/2026-11-27-db-egress-strategy-design.md`, разделы 5.3 и 6 (в репозитории платформы). Улучшение качества подбора и причин — следующий проект, не здесь.

## Общие ограничения

- Только репозиторий `C:\Users\Admin\Documents\intgetion-matching`, ветка `perf/matching-cost` от `main`. Платформа не меняется до подключения модуля.
- Оценки, причины и порядок выдачи не меняются: `ALGO_VERSION` не повышать.
- Зависимость `@intgetion/jobs` поднять до `#v0.1.3` (часть 2, Задача 1), если сборка это позволяет; иначе оставить и отметить в README.
- Коммиты от имени `Mark Evans`, без `Co-Authored-By` и `Generated with Claude Code`. Без push без «да» владельца.

## Фокус ревью

1. Действие человека (скрыл/сохранил вакансию) при кэше 24 часа → скрытая вакансия не показывается сразу: проверить, что фильтр скрытых применяется при чтении ленты, а не только при пересчёте (Задача 3).
2. Вакансия закрыта после расчёта → не попадает в ленту: проверить фильтр по статусу при чтении (Задача 3).
3. Лёгкий `readJobs` теряет поле, которое использует оценка → тест «одинаковые оценки до и после» (Задача 1).
4. Пустой результат пересчёта (пользователь без подходящих вакансий) → пересчитывается при каждом открытии ленты; оставлено как есть и задокументировано (Задача 3), стоимость видна по счётчикам Задачи 2.

---

### Задача 1: Лёгкие выборки

**Файлы:**
- Изменить: `src/modules/matching/repo/matching-repo.ts:381-400` (`readJobs`), `:509-527` (`readStoredMatches`)
- Тест: `src/modules/matching/__tests__/` (существующие тесты оценки) и `matching-repo.integration.test.ts`

**Интерфейсы:**
- `readJobs(jobIds, desiredTitles)` — тот же тип результата `JobWithSimilarity[]`; список колонок — как в платформе после PR #58 (`src/modules/matching/repo/matching-repo.ts` коммита `897a4330`: id, companyId, title, category, sectors, seniority, status, workFormat, employmentType, experienceMin/Max, locationCountry, countryRestrictions, timezoneRequired, workHoursStart/End, minOverlapHours, salaryMin/Max, salaryCurrency, salaryPeriod, salaryBasis). Тип `JobForScoring` сузить до этих полей; компилятор покажет, если оценка использует что-то ещё — тогда добавить именно это поле.
- `readStoredMatches(userId)` — тот же `StoredMatchRow[]`; вместо `breakdown` целиком читать `lowData: sql<boolean>\`coalesce((${matchingResults.breakdown}->>'lowData')::boolean, false)\``.

- [ ] **Шаг 1: Падающий тест** (интеграционный): для заранее созданных кандидата и 5 вакансий `computeMatches(userId)` даёт тот же набор `(jobId, score, explain)`, что сохранён фикстурой до правки (снимок результата записать в тест на текущем коде и закоммитить первым шагом).
- [ ] **Шаг 2:** снимок записан на текущем коде → PASS; коммит теста.
- [ ] **Шаг 3:** внести правки.
- [ ] **Шаг 4:** `npm test`, `npm run typecheck` → PASS, снимок совпадает.
- [ ] **Шаг 5:** коммит `Read only scoring columns of jobs and lowData of stored matches`.

### Задача 2: Счётчики стоимости

**Файлы:**
- Изменить: `src/modules/matching/service/compute.ts` (`computeMatches` ~101, `computeMatchesForJob` ~150)
- Тест: `src/modules/matching/__tests__/compute.test.ts`

**Интерфейсы:**
- `computeMatches(userId, opts)` возвращает дополнительно `stats: { prefiltered: number; jobsRead: number; written: number; ms: number }` (если сейчас возвращает массив — обернуть в `{ results, stats }` и обновить вызов в `getMatches`).
- `computeMatchesForJob(jobId)` возвращает `{ considered, written, ms }` (сейчас `{ considered, written }`).
- Одна строка лога на вызов через логгер модуля: `matching.compute user=<id> prefiltered=… jobsRead=… written=… ms=…` (без личных данных, только id).

- [ ] **Шаг 1: Падающие тесты** (repo замокан): `prefilterJobIds` вернул 3 id → `stats.prefiltered === 3`, `stats.jobsRead === 3`; `ms` — неотрицательное число.
- [ ] **Шаг 2:** `npm test` → FAIL.
- [ ] **Шаг 3:** реализовать.
- [ ] **Шаг 4:** `npm test` → PASS.
- [ ] **Шаг 5:** коммит `Report per-call matching cost`.

### Задача 3: Пересчёт по поводу, а не по таймеру

**Файлы:**
- Изменить: `src/modules/matching/service/cache-rules.ts:7` (`CACHE_MAX_AGE_MS`), функция `isCacheFresh`
- Тест: `src/modules/matching/__tests__/cache-rules.test.ts`, `feed.integration.test.ts` (или существующий тест ленты)

**Интерфейсы:**
- `CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000`.
- `isCacheFresh` — логика без изменений, кроме срока. Пустой набор результатов по-прежнему считается несвежим (хранить маркер пустого расчёта без миграции негде); в README отметить это как известную стоимость для пользователей без подходящих вакансий — решение о миграции за владельцем.

- [ ] **Шаг 1: Падающие тесты `cache-rules`:** строка возрастом 23 часа → свежая; 25 часов → несвежая; `profileUpdatedAt` позже `computedAt` → несвежая (как сейчас); другая `algoVersion` → несвежая (как сейчас).
- [ ] **Шаг 2: Проверочные тесты ленты** (Фокус ревью 1–2): после `getMatches` скрыть вакансию через таблицу отзывов → следующий вызов ленты её не показывает без пересчёта; закрыть вакансию → лента её не показывает. Если какой-то из них падает на текущем коде — фильтр добавить в чтение ленты (`service/feed.ts`), не в пересчёт.
- [ ] **Шаг 3:** `npm test` → FAIL (по возрасту 23 часа).
- [ ] **Шаг 4:** реализовать.
- [ ] **Шаг 5:** `npm test`, `npm run typecheck` → PASS.
- [ ] **Шаг 6:** README: правило пересчёта (анкета, версия алгоритма, 24 часа; новые вакансии — через очередь), счётчики стоимости.
- [ ] **Шаг 7:** коммит `Refresh stored matches on profile change or after 24 hours`; версия `0.2.0`, тег `v0.2.0` (без push до «да»).

---

## После части 3

- Замер: сумма `jobsRead` и `written` за сутки из логов до и после — входит в отчёт о расходе (часть 1, Задача 8) при подключении модуля.
- Качество подбора и причины, блок рекомендаций над общей подборкой для вошедших — следующий проект.
