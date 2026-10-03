Ты — Codex. Твоя следующая подфаза: **3B** проекта INTGETION JOB LIST. Агент: `codex`, ветка `codex/3b`, папка `C:\Users\Admin\Documents\Integetion jobs 3B`, миграция `src/db/migrations/0006_*.sql`, решения D60–D64.

Сначала прочитай `docs/prompts/_common.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй его порядок работы.

Зависимости: 3A и 2A должны быть в `origin/master`. Создай новый worktree от свежего `origin/master`.

## 3B по ТЗ

Раздел 22: Jobs CRUD (internal), `job_skills`, `job_languages`, `job_status_history`, publish (D12), risk-score v1, `/employer/jobs*`, cron expire. Вне скоупа: фильтры и публичный листинг (4A). DoD: переходы 4.3; P2.

- Таблицы `jobs`, `job_skills`, `job_languages`, `job_status_history` по 4.1. Деньги и их DTO — через `src/lib/money.ts` (делает GLM в задаче 4A-lib); если он ещё не в `master` — подожди его или опиши в отчёте, что дублировать нельзя. Деньги — `bigint` в минорных единицах + ISO 4217, период и база отдельно (D19); в DTO деньги — `{ amountMinor: string, currency, period, basis }` (раздел 6).
- Машина статусов вакансии — раздел 4.3, все переходы в одном месте, unit-тест на всю таблицу переходов.
- Publish по D12: unverified → `pending_moderation` (+ строка в `moderation_queue`), verified → `published`. Изменение published у unverified-компании → `pending_moderation`.
- Risk-score v1 — раздел 14.3; флаги ≥ 4 → ручная проверка даже для verified.
- API раздела 7 «Jobs» для работодателя: `POST /api/jobs`, `PATCH /api/jobs/:id`, `POST /api/jobs/:id/publish|pause|close|extend`. Права через `requireMembership` с `findMemberRole` из сервиса компаний; recruiter+ по 5.2. Imported-вакансия → 404 (не видна как своя).
- Навыки вакансии — только `skill_id`; нераспознанные — в `skill_suggestions` через сервис таксономии.
- Лимит создания вакансий (раздел 6): unverified 5/сутки, verified 50/сутки на компанию. Лимитер — `enforceRateLimit` из `src/lib/rate-limit.ts`; набор правил `rateRules` лежит в этом же файле, который меняет только Claude Code. Опиши нужные правила в отчёте, и Claude их добавит; или передай правило через параметр, если сигнатура это позволит.
- Cron `/api/cron/expire-jobs` (ежечасно, `Authorization: Bearer CRON_SECRET`, без секрета → 404; образец — `src/app/api/cron/rate-limit-gc/route.ts`).
- Страницы `/[locale]/employer/jobs`, `/employer/jobs/new`, `/employer/jobs/[id]`, `/employer/jobs/[id]/edit`. Строки — под ключом `employerJobs`.

## Тесты

Unit: таблица переходов 4.3, risk-score, деньги. Интеграция: CRUD + история статусов. e2e: работодатель создаёт и публикует вакансию. **P2**: чужой работодатель делает PATCH draft-вакансии → 404.
