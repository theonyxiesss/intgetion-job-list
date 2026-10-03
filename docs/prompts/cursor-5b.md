Ты — Cursor. Твоя подфаза: **5B** проекта INTGETION JOB LIST — пайплайн откликов у работодателя. Агент: `cursor`, ветка `cursor/5b`, папка `C:\Users\Admin\Documents\Integetion jobs 5B`, решения D115–D119. Миграция — только если без неё нельзя, номер `0012_*`.

5A принята и влита в `master`, миграция 0009 применена к облаку — спасибо. Старые папки `Integetion jobs 5A`, `5A-rules`, `2B` больше не используй: создай новый worktree от свежего `origin/master` и открой в Cursor именно его.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй их порядок работы. Зависимость 5A уже в `master`.

Прочитай в `docs/TZ_INTGETION_v6.md`: 22 (строки 5B и 5C), 4.2, 5.1–5.3, 7 «Applications» и «Candidates», 8 (страницы `/employer/jobs/[id]/applications`, `/employer/applications/[id]`), 15 (`application.viewed`, `application.status_changed` — только событие, отправку делает 9A), 19.2 (P3, P5); решения D2, D3, D13, D16, D23, D24 и свои D55–D59, D75–D79 в `docs/DECISIONS.md`.

## 5B по ТЗ

Раздел 22: список откликов, просмотр профиля (D24), auto-viewed, rejected, interview/offer/hired (без shortlisted). Вне скоупа: reveal и `shortlisted` (5C). DoD: P3, P5. Риск: преждевременный reveal.

- `GET /api/applications?as=employer&jobId=` — отклики на вакансию для члена компании (`requireMembership` с `findMemberRole` из сервиса компаний); чужая вакансия → 404. Курсорная пагинация (раздел 6).
- `GET /api/applications/:id` для члена компании: при первом открытии `applied → viewed` **через `transitionApplication` с `via: 'auto_view'`**, идемпотентно (повторное открытие ничего не меняет). Кандидат-владелец по-прежнему видит свой отклик без смены статуса.
- `PATCH /api/applications/:id/status` для работодателя: `rejected`, `interview`, `offer`, `hired` — только по таблице 4.2 и только через твои правила 5A-rules; `to = shortlisted` → 422 (P5).
- Просмотр профиля кандидата работодателем (D24): `GET /api/candidates/:id` теперь виден и членам компании, на вакансию которой кандидат откликнулся. В ответе **нет ключа `contacts`** (не `null` — ключа нет совсем, D16, P3), нет email входа, `auth_uid` и других полей из 5.3. Остальным — по-прежнему 404. Правку делай в сервисе кандидатов (твой модуль 2B): проверка «есть отклик на вакансию его компании» — через сервис откликов.
- Страницы `/[locale]/employer/jobs/[id]/applications` (список по статусам) и `/[locale]/employer/applications/[id]` (карточка отклика, профиль кандидата без контактов, кнопки rejected / interview / offer / hired). Строки — под ключом `employerApplications`.
- События уведомлений (`application.viewed`, `application.status_changed`) — опиши в отчёте, где их надо вызывать; саму отправку не делай (9A). Если в `src/modules/notifications` уже есть каталог событий (9A-lib), используй его типы.

## Правила

- e2e импортируют `test`/`expect` из `tests/e2e/fixtures.ts`; второй пользователь — `newContextWithIp(browser)`.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-cursor' pnpm build`.
- При конфликте в `pnpm-lock.yaml` во время rebase возьми версию из `master` и запусти `pnpm install`. При конфликтах в `src/messages/*.json` проверь, что файл остался валидным JSON и en/ru совпадают по ключам.

## Тесты

Unit: auto-view идемпотентен; работодатель не может `shortlisted`; DTO профиля для работодателя — набор ключей без `contacts`. Интеграция: член компании видит отклики только своих вакансий; чужой работодатель → 404 на список, на отклик и на профиль кандидата. e2e: работодатель открывает отклик → у кандидата статус `viewed`; переводит в `interview` → `offer` → `hired`. **P3**: в ответе профиля и отклика для работодателя нет ключа `contacts`. **P5**: после `viewed` контактов нет; PATCH в `shortlisted` → 422.

Отчёт по шаблону раздела 0 ТЗ, с выводом команд, ссылкой на зелёный CI ветки `cursor/5b` и выводом `git log --oneline origin/master..origin/cursor/5b`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
