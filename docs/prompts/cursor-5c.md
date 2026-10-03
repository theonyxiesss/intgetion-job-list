Ты — Cursor. Твоя подфаза: **5C** проекта INTGETION JOB LIST — «взаимный интерес» и открытие контактов. Агент: `cursor`, ветка `cursor/5c`, папка `C:\Users\Admin\Documents\Integetion jobs 5C`, миграция `src/db/migrations/0012_*.sql`, решения D120–D124.

5B принята и влита в `master` — спасибо. Одно замечание: в 5B не было записи в `MISSION_LOG.md` — это пункт DoD (раздел 23), в 5C добавь запись и за 5C, и коротко за 5B. Старые папки (`5A`, `5A-rules`, `5B`, `2B`) больше не используй: создай новый worktree от свежего `origin/master` и открой в Cursor именно его.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй их порядок работы. Зависимость 5B уже в `master`.

Прочитай в `docs/TZ_INTGETION_v6.md`: 22 (строка 5C), 4.1 (`application_reveals`, `candidate_contacts`), 4.2 (переход в `shortlisted` = express-interest), 5.2–5.3, 7 «Applications» (`express-interest`, `contacts`), 8 (`/contacts`), 15 (`mutual_interest.revealed` — только событие), 16.1 (аудит чтения контактов), 19.2 (P4, P14, P16), 20 (риск «забытые контакты»); решения D2, D3, D16, D23, D24 и свои D55–D59, D75–D79, D115–D119 в `docs/DECISIONS.md`.

## 5C по ТЗ

Раздел 22: express interest — `shortlisted` + reveal в одной транзакции, `/contacts`, D23, аудит чтений. Вне скоупа: чат (V2, D10). DoD: P4, P14, P16 (contacts); тест атомарности.

- Миграция 0012: `application_reveals` по 4.1 (`via = 'shortlisted'`), RLS через `public.enable_rls_deny_all()`.
- `POST /api/applications/:id/express-interest` — член компании recruiter+ (`requireMembership`): в **одной транзакции** `SELECT … FOR UPDATE` отклика, переход в `shortlisted` через `transitionApplication` с `via: 'express_interest'`, INSERT в `application_reveals` (D3). Повтор → 200 идемпотентно, без второй строки reveal. Чужой отклик → 404. Из статусов, откуда переход запрещён таблицей 4.2, → 409.
- `GET /api/applications/:id/contacts` — только член компании, только пока статус в `shortlisted | interview | offer | hired` (D23), иначе 404. Каждый успешный вызов пишет `audit_logs(action='contacts.read')` через `recordAudit` из `src/lib/audit.ts` (P16). Контакты читаются только через `contactsService` (D16); `contacts/repo` импортирует только `contacts/service`.
- После `withdrawn`/`rejected` (и удаления аккаунта — это 10C) контакты снова недоступны, строка reveal остаётся для аудита (D23, P14).
- Страница `/[locale]/contacts` для работодателя — список кандидатов, чьи контакты сейчас доступны (только по D23), и кнопка «Проявить интерес» в карточке отклика из 5B. Строки — под ключами `contacts` и `expressInterest`.
- Событие `mutual_interest.revealed` — опиши в отчёте, где его вызвать; отправку не делай (9A).

## Правила

- e2e импортируют `test`/`expect` из `tests/e2e/fixtures.ts`; второй пользователь — `newContextWithIp(browser)`.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-cursor' pnpm build`.
- При конфликте в `pnpm-lock.yaml` во время rebase возьми версию из `master` и запусти `pnpm install`; после конфликтов в `src/messages/*.json` проверь, что JSON валиден и ключи en/ru совпадают.

## Тесты

Unit: правило D23 по всем статусам; идемпотентность express-interest. Интеграция: **атомарность** — сбой между UPDATE статуса и INSERT reveal откатывает оба (например, искусственная ошибка вставки reveal); два одновременных express-interest → одна строка reveal. e2e: **P4** — после express-interest контакты видны члену компании, но не другому работодателю и не гостю (404); **P14** — после `rejected` и после `withdrawn` контакты снова 404 (строка reveal осталась); **P16** — каждое чтение контактов даёт запись `contacts.read` в журнале аудита; DTO отклика и профиля до reveal по-прежнему без ключа `contacts` (P3).

Отчёт по шаблону раздела 0 ТЗ, с выводом команд, ссылкой на зелёный CI ветки `cursor/5c` и выводом `git log --oneline origin/master..origin/cursor/5c`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
