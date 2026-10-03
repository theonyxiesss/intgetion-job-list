Ты — GLM. Твоя подфаза: **4B** проекта INTGETION JOB LIST — сохранение, скрытие и жалобы на вакансии. Агент: `glm`, ветка `glm/4b`, папка `C:\Users\Admin\Documents\Integetion jobs 4B`, миграция `src/db/migrations/0011_*.sql`, решения D110–D114.

Твои правила уведомлений 9A-lib приняты и влиты в `master` — спасибо. Старые папки `Integetion jobs notify`, `score`, `4A-lib` больше не используй: создай новый worktree от свежего `origin/master`.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй их порядок работы.

Зависимость: **4A должна быть в `origin/master`** (её сделал Codex; Claude Code вливает её сейчас). Если её там ещё нет — ответь «ЖДУ: 4A» и подожди.

Прочитай в `docs/TZ_INTGETION_v6.md`: 22 (строка 4B), 4.1 (`saved_jobs`, `user_job_feedback`, `reports`, enum `feedback_action`, `report_reason`, `report_status`), 7 «Jobs» (save, hide, report), 6 (лимит reports 10/сутки), 10.5 (как feedback используется в скоринге), 14.5 (жалобы), 5.3, 17 (retention `user_job_feedback` 365 дней); решения D8, D9, D13, D16, D24 и D80–D81 в `docs/DECISIONS.md`.

## 4B по ТЗ

Раздел 22: Save/Hide/hide_company/report + `user_job_feedback`, `/saved-jobs`. Вне скоупа: loop (6B), разбор жалоб админом и авто-пауза компании по 3 жалобам (это вторая часть 10A у Claude Code — он возьмёт твою таблицу `reports`). DoD: скрытая вакансия исчезла из листинга; лимит жалоб работает.

- Таблицы `saved_jobs`, `user_job_feedback`, `reports` по 4.1, RLS через `public.enable_rls_deny_all()`. В `reports` — `unique(reporter_id, entity_type, entity_id)`: одна жалоба на объект.
- Модуль `src/modules/feedback` (или по ТЗ, если там другое имя — опиши в D110): сервис записи событий `user_job_feedback` с действиями из enum (`viewed`, `saved`, `unsaved`, `applied`, `applied_external`, `dismissed`, `hidden`, `hidden_company`) и причиной для `hidden`/`dismissed` (`salary | format | timezone | company | role | other`). Экспортируй функцию записи — её будут звать 5A (`applied`) и 8A (`applied_external`).
- API раздела 7: `POST /api/jobs/:id/save`, `DELETE /api/jobs/:id/save`, `POST /api/jobs/:id/hide` `{ reason?, scope: 'job'|'company' }`, `POST /api/jobs/:id/report` `{ reason, details? }`. Все — только залогиненный пользователь (`requireUser`). Вакансия, которой не видно в публичном листинге (не published, компания suspended), → 404. Повторная жалоба на тот же объект → 409 с понятным кодом (запиши в D111). Лимит жалоб — `enforceRateLimit("report", userId)` из `src/lib/rate-limit.ts` (правило уже есть, файл не меняй).
- **Скрытые не показываются**: `GET /api/jobs` (и главная, и страница компании, если там список вакансий) для залогиненного пользователя исключает скрытые им вакансии и вакансии скрытых им компаний (раздел 7: «Скрытые пользователем вакансии/компании исключаются»). Это правка кода 4A в модуле `jobs`: меняй минимально и через сервис, логику фильтрации клади в `service/`, не в `repo/` (замечание 3.2 из интеграции 3B).
- Страница `/[locale]/saved-jobs` (список сохранённых, снять сохранение) и кнопки Save / Hide / Report на `/[locale]/jobs/[id]` (диалог жалобы с причиной). Строки — под ключами `savedJobs` и `jobActions` в `en.json`/`ru.json`.
- Жалоба создаёт строку `reports` со статусом `open`; админский разбор — не твоя часть.

## Правила

- e2e импортируют `test`/`expect` из `tests/e2e/fixtures.ts`.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-glm' pnpm build`.
- При конфликте в `pnpm-lock.yaml` во время rebase возьми версию из `master` и запусти `pnpm install`.

## Тесты

Unit: сервис feedback (допустимые действия и причины), правило «одна жалоба на объект», фильтр скрытых. Интеграция: save/unsave идемпотентны, hide убирает вакансию из выдачи пользователя, но не из выдачи другого, hide_company убирает все вакансии компании. e2e: пользователь сохраняет вакансию и видит её в `/saved-jobs`; скрывает — вакансия пропала из `/jobs`; жалуется — повторная жалоба отклонена; 11-я жалоба за сутки → 429 с `Retry-After` (P15 для reports).

Отчёт по шаблону раздела 0 ТЗ, с выводом команд, ссылкой на зелёный CI ветки `glm/4b` и выводом `git log --oneline origin/master..origin/glm/4b`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
