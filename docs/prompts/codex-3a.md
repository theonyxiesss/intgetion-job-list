Ты — Codex. Твоя подфаза: **3A** проекта INTGETION JOB LIST. Агент: `codex`, ветка `codex/3a`, папка `C:\Users\Admin\Documents\Integetion jobs 3A`, миграция `src/db/migrations/0004_*.sql`, решения D50–D54.

Сначала прочитай `docs/prompts/_common.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй его порядок работы.

Зависимость: 1B должна быть в `origin/master`.

## 3A по ТЗ

Раздел 22: `companies`, `company_members`, `employer_profiles`, `/onboarding`, `/employer/company`, логотип, проверка дублей. Вне скоупа: инвайты, верификация (10B). DoD: тест membership; заготовка P2; импорт-компанию нельзя редактировать.

- Таблицы по разделу 4.1 (`companies`, `company_members`, `employer_profiles`), RLS через `public.enable_rls_deny_all()`. Для `gin_trgm(name)` нужен `pg_trgm` (его может создать миграция 2A — проверь `0003`; если нет — `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions`).
- `moderation_queue` (раздел 4.1) создаёшь ты: 3A первым пишет в неё флаг `possible_duplicate`. Только таблица и запись; очередь и UI админа — 10A.
- Модуль `src/modules/companies` (`api/`, `service/`, `repo/`, `schemas/`, `__tests__/`). Экспортируй из сервиса `findMemberRole(companyId, userId)` — это функция для `requireMembership` (D38.2).
- API раздела 7 «Companies»: `POST /api/companies`, `GET /api/companies/:slug` (публичная часть; вакансий ещё нет — пустой список), `PATCH /api/companies/:id` (owner/admin), `POST /api/companies/:id/logo`.
- Права по 5.1–5.2: чужая компания → 404, участник без роли → 403. `origin='imported'` нельзя редактировать и в неё нельзя вступить (D9). Последнего owner удалить нельзя.
- Дубли: domain или `similarity(name) ≥ 0.8` → компания создаётся, плюс строка в `moderation_queue` с `possible_duplicate`.
- Логотип: image/png|jpeg|webp ≤ 2 MB, MIME по сигнатуре, перекодировка `sharp` → webp 256×256, случайное имя, Supabase Storage. Для Storage на сервере нужен `SUPABASE_SERVICE_ROLE_KEY`, которого в `.env.local` нет. Сделай всё, что можно без ключа (валидация, перекодировка, интерфейс хранилища с тестовым двойником в тестах), а загрузку в Storage пометь BLOCKED в отчёте с тем, что нужно от пользователя. Зависимость `sharp` разрешена.
- Страницы `/[locale]/onboarding` (выбор «Ищу работу» / «Нанимаю»; «Ищу работу» ведёт на `/profile/edit`, который делает 2B — до него ссылка на `/`) и `/[locale]/employer/company`. Строки — под ключами `onboarding` и `company` в `en.json`/`ru.json`.
- Аудит: смена статуса компании пишет `audit_logs` через `recordAudit` из `src/lib/audit.ts`.

## Тесты

Unit: права (owner/admin/recruiter/member, не-член → 404, imported → запрет), дубли, валидация логотипа. Интеграция на БД: membership, последний owner. e2e: зарегистрированный пользователь создаёт компанию и редактирует её; другой пользователь получает 404 (это заготовка P2). Для e2e используй хелперы из `tests/e2e/auth.spec.ts` и `tests/e2e/mail.ts` (не меняя их поведение) и заголовок `origin: http://127.0.0.1:3000` на API-запросах.
