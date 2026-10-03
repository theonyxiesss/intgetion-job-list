Ты — Codex. Твоя подфаза: **4A** проекта INTGETION JOB LIST (передана тебе от GLM: он занят скорингом). Агент: `codex`, ветка `codex/4a`, папка `C:\Users\Admin\Documents\Integetion jobs 4A`, миграция `src/db/migrations/0007_*.sql`, решения D95–D99.

3B принята и влита в `master`, миграция 0006 применена к облаку — спасибо. При интеграции Claude Code поправил одно: DTO вакансии и страница работодателя отдавали `risk_score`/`risk_flags`, а раздел 5.3 запрещает это клиенту; теперь их нет, и это проверяет `src/modules/jobs/__tests__/dto.test.ts`. Старые папки `Integetion jobs 3A`/`3B` больше не используй: создай новый worktree от свежего `origin/master`.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй их порядок работы.

## 4A по ТЗ

Раздел 22: `/jobs`, `/jobs/[id]`, фильтры (tz-overlap, зарплата по D4/D5), FTS, курсорная пагинация, seed 5k, `/companies/[slug]`, главная с живыми данными, `fx_rates` + cron. Вне скоупа: matching (6A), save/hide (4B). DoD: perf p95 < 500 ms; unit фильтров. Риск: производительность FTS.

- `GET /api/jobs` и `GET /api/jobs/:id` по разделу 7 (не-published → 404, кроме членов компании и админа; imported → с `source{name,url}`). Карточка — раздел 9.2. Публичный DTO — без `risk_score`, `risk_flags`, `created_by` и без `application_email` для гостей (5.3); добавь тест набора ключей.
- Фильтры раздела 7: `q, category, skills[], workFormat[], employmentType[], tzOverlapWith + minOverlap, salaryMin+currency+period+basis, country, source, postedWithin, sort`. Зарплата строго по D4/D5 — **через `src/lib/money.ts`** (сравнимость, курсы, `salaryScore`); пересечение часов — **через `workHoursOverlap` из `src/lib/tz.ts`** (D65–D69). Свою денежную или временную логику не пиши. Несравнимые вакансии остаются и помечаются.
- FTS + индексы; курсорная пагинация `{ items, nextCursor }`, limit ≤ 50, по умолчанию 20 (раздел 6). Фильтр по зарплате в SQL допустим только для сравнимых случаев; помечание несравнимых — в коде через `money.ts`.
- `fx_rates` (`numeric(18,8)`, D19) + cron `/api/cron/fx-rates` раз в сутки (`Bearer CRON_SECRET`, без секрета → 404; образец — `src/app/api/cron/expire-jobs/route.ts`), расписание добавь в `vercel.json`. Источник курсов — официальный API без ключа (например, ECB) или с ключом в env; если нужен ключ — интерфейс + тестовый двойник + BLOCKED в отчёте.
- Seed 5 000 опубликованных вакансий в `src/db/seed/` (идемпотентный, не запускается в миграции) и perf-скрипт: `/api/jobs` p95 < 500 ms server-side (раздел 3.4, 19.1). Если p95 не укладывается — это провал DoD, так и пиши.
- Страницы `/[locale]/jobs`, `/[locale]/jobs/[id]`, `/[locale]/companies/[slug]`. На главной блок «последние вакансии» из пустого состояния (D35) становится живым: файл `src/app/[locale]/page.tsx` можно менять только в этом блоке. Публичная страница компании не показывает компании в статусе `suspended`/`rejected` (замечание из интеграции 3A). Строки — под ключами `jobs` и `companyPage`.
- Бюджет главной: LCP < 2.5 s (медиана трёх прогонов в CI, D41; сейчас около 2.1 s — не ухудшай), JS < 150 KB gz.
- Если меняешь модуль `jobs`, переноси бизнес-логику из `repo/jobs-repo.ts` в `service/` (замечание из интеграции 3B: repo — только запросы, раздел 3.2). Не обязательно делать это целиком, но новый код клади правильно.

## Правила

- e2e импортируют `test`/`expect` из `tests/e2e/fixtures.ts` (правило 6a в `docs/PARALLEL_WORK.md`).
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-codex' pnpm build`.

## Тесты

Unit: каждый фильтр, все нейтральные случаи D4/D5, tz-overlap с DST и полночью, курсор, набор ключей публичного DTO. Интеграция: поиск на seed. e2e: листинг, фильтр, страница вакансии, 404 на чужой draft, 404 на компанию в статусе `suspended`. axe на `/jobs` и `/jobs/[id]` без critical.

Отчёт по шаблону раздела 0 ТЗ, с выводом команд, ссылкой на зелёный CI ветки `codex/4a` и выводом `git log --oneline origin/master..origin/codex/4a`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
