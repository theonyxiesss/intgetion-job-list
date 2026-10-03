Ты — Codex. Твоя подфаза: **8A** проекта INTGETION JOB LIST — импорт вакансий на фикстурах (передана тебе от Antigravity: он занят LLM-слоем). Агент: `codex`, ветка `codex/8a`, папка `C:\Users\Admin\Documents\Integetion jobs 8A`, миграция `src/db/migrations/0008_*.sql`, решения D70–D74.

4A принята и влита в `master`, миграция 0007 применена к облаку; `GET /api/jobs` на 5000 вакансий — p95 17.8 мс, спасибо. Таблицы `import_sources` и `job_sources`, которые ты создал в 4A, остаются за 8A (D49): добавь только `import_runs`. Старые папки `Integetion jobs 3A`, `3B`, `4A` больше не используй: создай новый worktree от свежего `origin/master`.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй их порядок работы. Зависимости 3B и 2A уже в `master`.

Прочитай в `docs/TZ_INTGETION_v6.md`: 13 целиком, 4.1 (`import_sources`, `import_runs`, `job_sources`, `jobs`, `companies`), 14.3, 17 (retention `import_runs` 180 дней), 22 (8A, 8B); решения D8, D9, D18, D42, D49, D60–D64, D95–D99 в `docs/DECISIONS.md`.

## 8A по ТЗ

Раздел 22: импорт на фикстурах — адаптеры, нормализация, дедуп, external apply (D8), автомодерация, `import_runs`, expire. Вне скоупа: живой источник (8B — только с founder approval в MISSION_LOG, D18). DoD: P6; кейс дедупа; scam отклонён.

- Миграция 0008: только `import_runs` по 4.1 (RLS через `public.enable_rls_deny_all()`). `import_sources.enabled` и `republish_allowed` по умолчанию false; при `IMPORT_LIVE_ENABLED=false` нет вообще никаких сетевых запросов к внешним источникам.
- Фикстуры — `fixtures/import/<source>/`, два вымышленных источника (api и rss); данные синтетические, без копирования реальных объявлений; среди них точный дубль между источниками, почти-дубль, scam-вакансия, вакансия с нераспознаваемыми навыками, истёкшая вакансия. Скрейпинг HTML запрещён (D18).
- Модуль `src/modules/ingestion` без состояния в памяти (3.2): адаптер на источник → нормализация (13.2; навыки через `normalizeSkill()` из сервиса таксономии, нераспознанные в вакансию не попадают, а уходят в `skill_suggestions` с `source: 'import'`) → дедуп (13.3) → автомодерация и жизненный цикл (13.4; scam-паттерны — `src/config/scam-patterns.ts`, список наполняешь ты) → запись через сервис вакансий. Логику держи в `service/`, а `repo/` — только запросы (3.2).
- Импортированные компании — `origin='imported'`: их нельзя claim, в них нельзя вступить, бейджа «проверено» нет (D9). Импортированная вакансия не редактируется работодателем (PATCH → 404, это уже так в 3B — проверь тестом P6).
- External apply (D8): `POST /api/jobs/:id/apply-external` → `{ externalUrl }` + запись `user_job_feedback(action='applied_external')`. Таблицу `user_job_feedback` делает GLM в 4B параллельно с тобой: если к твоему отчёту её нет в `master`, сделай вызов через интерфейс с тестовым двойником и пометь запись feedback BLOCKED; если есть — используй его сервис записи feedback.
- Cron `/api/cron/import` (по источнику, не чаще раза в час; `Bearer CRON_SECRET`, без секрета → 404; образец — `src/app/api/cron/expire-jobs/route.ts`), расписание — в `vercel.json`. Работает только с фикстурами.

## Правила

- e2e импортируют `test`/`expect` из `tests/e2e/fixtures.ts`.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-codex' pnpm build`.
- При конфликте в `pnpm-lock.yaml` во время rebase возьми версию из `master` и запусти `pnpm install`; после конфликтов в `src/messages/*.json` проверь, что JSON валиден и ключи en/ru совпадают.

## Тесты

Unit: нормализация, дедуп (одинаковая вакансия из двух фикстур → одна запись + merge), scam → rejected, истёкшая → не публикуется. Интеграция: полный прогон фикстуры → `import_runs` с правильными счётчиками (`fetched`, `created`, `updated`, `merged`, `rejected`, `expired`); повторный прогон идемпотентен. **P6**: импортированную вакансию нельзя редактировать (PATCH → 404); вступить или claim в imported-компанию нельзя. e2e: импортированная вакансия видна в `/jobs` с источником, кнопка отклика ведёт на внешний URL.

Отчёт по шаблону раздела 0 ТЗ, с выводом команд, ссылкой на зелёный CI ветки `codex/8a` и выводом `git log --oneline origin/master..origin/codex/8a`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
