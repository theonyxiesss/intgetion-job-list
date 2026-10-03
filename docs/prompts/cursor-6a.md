Ты — Cursor. Твоя подфаза: **6A** проекта INTGETION JOB LIST — матчинг v1 на сервере: кэш `matching_results`, SQL-префильтр и сервис пересчёта. Агент: `cursor`, ветка `cursor/6a`, папка `C:\Users\Admin\Documents\Integetion jobs 6A`, миграция `src/db/migrations/0015_*.sql`, решения D150–D154.

4B и 9A приняты и влиты в `master` — спасибо, обе хорошего качества. По 9A: при интеграции добавлено, что без `UNSUBSCRIBE_SECRET` длиной ≥ 32 токены отписки отклоняются (иначе их можно было подделать).

**Зачем сейчас 6A:** следующий большой блок — новый дизайн (`docs/DESIGN.md`). Фундамент UI-1 сейчас делает Claude Code. Твоя подфаза UI-2 (кандидатская часть) начнётся после вливания UI-1, а пока — 6A: это чистый бэкенд, интерфейс он не трогает. UI-страницу `/matches` и `GET /api/matches` делает 6B, не ты.

Начни worktree от свежего `origin/master`:

```bash
git fetch origin
git worktree add "../Integetion jobs 6A" -b cursor/6a origin/master
```

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй их порядок работы.

Прочитай в `docs/TZ_INTGETION_v6.md`: 10 целиком (10.1–10.9), 4.1 (`matching_results`, `candidate_profiles`, `candidate_skills`, `job_skills`, `job_languages`, `user_job_feedback`), 22 (строка 6A, DoD), 19.2; решения D4, D5, D6, D11, D19, D30 и D90–D94 (6A-score от GLM — формулы уже лежат в `src/modules/matching/score/`, их **не переписывай**, только используй), D110–D114 (4B: `user_job_feedback`, скрытия).

## 6A по ТЗ

Раздел 22: hard-фильтры, компоненты, штрафы, explain, `matching_results`, tz-алгоритм 10.6. DoD: кейсы нейтральной зарплаты, gross/net, DST, полночь.

- **Миграция 0015:** `matching_results` по 4.1 — PK `(user_id, job_id)`, `score numeric(5,4)`, `breakdown jsonb`, `explain jsonb`, `algo_version smallint`, `computed_at`, индекс `(user_id, score desc)`, FK с `ON DELETE CASCADE` на `users` и `jobs`, RLS через `public.enable_rls_deny_all()`, права `app_rw`.
- **SQL-префильтр** (`src/modules/matching/repo/`): опубликованные вакансии видимых компаний (не `suspended`/`rejected`, как в публичном каталоге 4A), прошедшие hard-фильтры, которые выражаются в SQL (формат работы, тип занятости и т.п. по 10.2), и имеющие ≥ 1 общий навык **или** категорию с профилем; без скрытых пользователем вакансий и вакансий скрытых компаний (4B, `hidden` / `hidden_company`); лимит 500. Всё, что не выражается в SQL (перекрытие часов по 10.6, зарплата по 10.4), досчитывается в TS функциями из `score/`.
- **Сервис** (`src/modules/matching/service/`): `computeMatches(userId, { now })` — префильтр → скоринг функциями `score/*` → feedback-множители (10.5, из `user_job_feedback`) → штрафы → порог 0.55 → top-200 записываются в `matching_results` одной транзакцией (старые строки пользователя удаляются). `getMatches(userId, { now })` — отдаёт кэш, если он свежий, иначе пересчитывает: кэш устарел, если старше 6 ч, если `candidate_profiles.updated_at > computed_at` или если `algo_version` в строках ≠ текущей константе `ALGO_VERSION`. Возвращает `{ items: [{ jobId, score, explain }], lowData }` (`lowData` — по правилу 10.x/D90–D94: мало данных в профиле).
- Explain — только детерминированный из breakdown (D30), функциями `score/explain.ts`; LLM не участвует.
- Пересчёт при публикации вакансии (pg-boss) и `GET /api/matches`, страница `/matches`, «почему подходит» — это **6B**, не делай. Оставь экспортируемую функцию `computeMatchesForJob(jobId)` с префильтром кандидатов (≤ 2 000) **без** очереди — 6B подключит её к pg-boss.
- Производительность (раздел 3): `getMatches` из кэша p95 < 300 ms, холодный пересчёт p95 < 1500 ms на seed 5k вакансий (`src/db/seed/jobs-4a.mjs`, только loopback БД). Замерь в интеграционном тесте так же, как это сделано в 4A (`public-search.integration.test.ts`).
- Метрики качества 10.8 и `/admin/metrics` — 11B, не делай.

## Правила

- Не трогай файлы Claude Code (список в PARALLEL_WORK, правило 5) и `src/components/ui/*`, `src/app/globals.css` (идёт UI-1). UI в 6A нет вообще.
- `src/modules/matching/score/*` — только чтение; если найдёшь ошибку в формуле — опиши в отчёте и в D150+, исправление отдельным коммитом с тестом.
- Деньги — `bigint` и `src/lib/money.ts`, время — `src/lib/tz.ts` (D19, D6). Никакого float для денег.
- При конфликте в `pnpm-lock.yaml` во время rebase возьми версию из `master` и запусти `pnpm install`.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-cursor' pnpm build`.
- Запись в `MISSION_LOG.md` обязательна.

## Тесты

- **Unit** (что не покрыто в 6A-score): правило свежести кэша (6 ч, профиль новее, `algo_version`), порог 0.55 и top-200, применение feedback-множителей и штрафов в сборке, `lowData`.
- **Интеграция (DoD):**
  - нейтральная зарплата: у вакансии нет зарплаты → компонент нейтрален, вакансия не выпадает;
  - gross/net: ожидание net против вакансии gross считается по D4/D5;
  - DST: кандидат `Europe/Berlin`, вакансия с требованием перекрытия в `America/New_York` — результат одинаков в дни до и после перехода на летнее время (или меняется ровно как по 10.6);
  - полночь: рабочие часы кандидата через полночь (например 22:00–06:00) корректно пересекаются;
  - скрытая вакансия и вакансия скрытой компании не попадают в результат; `dismissed` понижает категорию (10.5);
  - вакансия `suspended`-компании и снятая (`removed`) не попадают;
  - кэш: второй вызов не пересчитывает (замер или счётчик), изменение профиля — пересчитывает;
  - перф на 5k: p95 из кэша < 300 ms, холодный < 1500 ms.

Отчёт по шаблону раздела 0 ТЗ: с выводом команд, ссылкой на зелёный CI ветки `cursor/6a` и выводом `git log --oneline origin/master..origin/cursor/6a`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный. После 6A ждёт UI-2 (`docs/DESIGN.md`, раздел 14) — промпт придёт отдельно, когда UI-1 будет в `master`.
