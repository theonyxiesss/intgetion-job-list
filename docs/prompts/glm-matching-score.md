Ты — GLM. Задача: чистый скоринг matching v1 в `src/modules/matching/score/` для проекта INTGETION JOB LIST. Это выделенная заранее часть подфазы 6A: только чистые функции на простых объектах, без базы, SQL, API, очередей и UI.
Агент: `glm`, ветка `glm/matching-score`, папка `C:\Users\Admin\Documents\Integetion jobs score`, решения D90–D94. Миграций нет.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и действуй по ним: новый worktree от свежего `origin/master`, план, DoD, отчёт, в `master` не пушить. Зависимостей нет: твои `src/lib/money.ts` и `src/lib/tz.ts` уже в `master` — используй их, не дублируй. Старую папку `Integetion jobs 4A-lib` больше не используй.

Прочитай в `docs/TZ_INTGETION_v6.md`: 10 целиком (10.1–10.9), 4.1 (поля `candidate_profiles`, `candidate_preferences`, `candidate_skills`, `candidate_languages`, `jobs`, `job_skills`, `job_languages`, `matching_results`), 11.2; решения D4, D5, D6, D11, D19, D30 и свои D65–D69 в `docs/DECISIONS.md`.

## Что сделать (`src/modules/matching/score/`)

Входные типы — простые объекты (`CandidateForScoring`, `JobForScoring`, `FeedbackForScoring`), описанные в этом же модуле по полям раздела 4.1. Таблиц ещё нет; когда 2B, 3B и 4B появятся, 6A будет только собирать эти объекты из БД.

1. **Hard-фильтры 10.2** — `hardFilter(candidate, job, context)` → `{ pass: true } | { pass: false, reason }` для всех 6 пунктов. Валюта и gross/net — не hard (D4, D5). Пересечение часов для п.5 — через `workHoursOverlap` из `src/lib/tz.ts`.
2. **Компоненты 10.3**, каждый → `{ score: number 0..1 } | { neutral: true, reason }`:
   - skills — `Σ w·m / Σ w`, уровни `skill_level` по порядку `novice < intermediate < advanced < expert`;
   - role/title — сходство названий приходит **параметром** (в 6A его посчитает pg_trgm в SQL), плюс правило категории `max(·, 0.7)`;
   - salary — через `salaryScore`/сравнимость из `src/lib/money.ts` (курсы — параметром);
   - tz overlap — `min(1, O / max(R, 1))`;
   - experience — с правилом `max + 3 → 0.7`;
   - languages — CEFR `A1 < A2 < B1 < B2 < C1 < C2 < native`.
3. **Сборка**: веса 0.35/0.15/0.20/0.10/0.10/0.10, нейтральные компоненты исключаются, вес перераспределяется; `Σ` активных весов < 0.4 → `lowData = true`. Штрафы: каждый отсутствующий must-have (weight = 3) → `×0.8`; вакансия без зарплаты → `×0.95`.
4. **Feedback 10.5** как чистая функция от уже посчитанных событий: `hidden_company` → исключение; `hidden`/`dismissed` в категории за 90 дней, n событий → `×0.9ⁿ`, не ниже 0.6; навык в ≥ 2 сохранённых или откликнутых вакансиях за 90 дней → `+0.03` за навык, суммарно не выше `×1.15`; сигнал «предложить обновить поле» при ≥ 3 скрытиях с причиной `salary`/`format`/`timezone` (только флаг, сама функция ничего не меняет).
5. **Итог**: `score = clamp(base × штрафы × feedback, 0, 1)`, порог показа 0.55, `breakdown` (все компоненты, веса, штрафы, `breakdown.feedback` — множители), `ALGO_VERSION = 1`. Наружу (раздел 5.3) потом уйдут только `explain` и `score`, округлённый до 2 знаков, — сделай функцию `toPublicMatch(result)`, которая отдаёт только их.
6. **Explain 10.7 (D30)** — детерминированно из `breakdown`, без LLM: массив `{ criterion, verdict: matched|partial|neutral|failed, detail: { key, params } }`, порядок matched → partial → neutral → failed, `topExplain(…, 4)` для карточки. Ключи i18n — под `explain.*`; строки добавь в `src/messages/en.json` и `ru.json` **только под своим ключом верхнего уровня `explain`**, файл не переформатируй.
7. **Semantic 10.9**: интерфейс `SemanticProvider` и `NoopSemanticProvider` → `null` (компонент не используется, D11).
8. `src/modules/matching/service/index.ts` экспортирует публичные функции скоринга.

## Правила

- Меняешь только: `src/modules/matching/**`, `src/messages/{en,ru}.json` (только ключ `explain`), `docs/DECISIONS.md` (D90–D94, в конец), `MISSION_LOG.md` (своя запись в конец). `src/lib/money.ts` и `src/lib/tz.ts` — если нужна правка, сделай её минимальной и опиши в отчёте отдельно.
- Никакой арифметики денег в float (D19); скор — число 0..1.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-glm' pnpm build`.

## Тесты (unit, vitest)

- Каждый hard-фильтр: проходит и не проходит.
- Каждый компонент: обычный случай, граница и нейтральный случай. Все нейтральные случаи зарплаты D4/D5 (разные периоды, hour, gross/net, нет курса, курс старше 7 дней) — компонент нейтрален, вакансия **не** исключается.
- Перераспределение весов и `lowData` на границе 0.4.
- Штрафы must-have (0, 1, 2 отсутствующих) и «без зарплаты».
- Feedback: `×0.9ⁿ` с полом 0.6, `+0.03` с потолком `×1.15`, `hidden_company`.
- Explain: порядок verdict, не больше 4 пунктов, в `toPublicMatch` нет `breakdown`, весов и сырых компонентов.
- Кейсы из DoD 6A по разделу 22: нейтральная зарплата, gross/net, DST, полночь.

Отчёт по шаблону раздела 0 ТЗ (код подфазы — `6A-score`), с выводом команд, ссылкой на зелёный CI ветки `glm/matching-score`, решениями D90+ и выводом `git log --oneline origin/master..origin/glm/matching-score`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
