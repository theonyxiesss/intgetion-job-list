# API: правила и эндпоинты

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

## 6. ОБЩИЕ ПРАВИЛА API
- REST под `/api`, JSON, zod на вход; ответ ошибки: `{ "error": { "code", "message", "details"? } }`.
- Пагинация — курсорная: `?cursor=&limit=` (limit ≤ 50, default 20), ответ
  `{ items, nextCursor }`.
- Деньги во всех DTO: `{ amountMinor: string, currency, period, basis }`
  (bigint сериализуется строкой).
- Мутирующие запросы: проверка `Origin` == `NEXT_PUBLIC_SITE_URL` (CSRF) +
  cookies `SameSite=Lax`.

**Каталог ошибок**

| HTTP | code | Когда |
|------|------|-------|
| 400 | VALIDATION_ERROR | zod |
| 401 | UNAUTHENTICATED | нет сессии |
| 403 | FORBIDDEN | объект виден, действие запрещено |
| 404 | NOT_FOUND | нет / чужое / admin для не-админа |
| 409 | ALREADY_APPLIED, REAPPLY_LIMIT, INVALID_TRANSITION, SLUG_TAKEN, DOMAIN_TAKEN | конфликты |
| 422 | EXTERNAL_APPLY (`details.externalUrl`), PROFILE_INCOMPLETE (`details.completeness`, `details.missing[]`), JOB_NOT_PUBLISHED, IMPORTED_READONLY, CONFIRMATION_REQUIRED | бизнес-правила |
| 429 | RATE_LIMITED (`Retry-After`), BOT_BUDGET_EXCEEDED | лимиты |

**Rate limits (D26)**

| Ключ | Лимит |
|------|-------|
| login (IP+email) | 5 / 15 мин |
| magic link / reset (email) | 3 / час |
| register (IP) | 10 / час |
| apply (user) | 30 / сутки |
| создание вакансий (company) | unverified 5 / сутки, verified 50 / сутки |
| reports (user) | 10 / сутки |
| bot (гость: IP+session / user) | 30 / 200 сообщений в сутки |
| глобально (IP) | 300 запросов / мин |

---

## 7. API — ЭНДПОИНТЫ

Формат: метод путь — доступ — назначение — тело/параметры — ответ/правила.

**Auth / аккаунт** (Supabase Auth на клиенте + серверные хуки)
- `POST /api/auth/register` — гость — email+пароль или magic link; `{ email, password?, locale, acceptTerms: true }` → создаёт `users` после подтверждения email (callback). Пароль ≥ 10 символов, проверка по HIBP k-anon (V2 — OPEN QUESTION; MVP — список топ-10k).
- `GET /auth/callback` — подтверждение email/magic link → создаёт `users`, привязывает гостевую бот-сессию (cookie `bot_session`).
- `POST /api/auth/logout`, `POST /api/auth/reset` — стандартно, ответ всегда 200 (anti-enumeration).
- `GET /api/me` — user — `{ id, locale, platformRole?, hasCandidateProfile, companies:[{id,name,role}] }`.
- `PATCH /api/me` — user — `{ locale?, marketingOptIn? }`.
- `GET /api/me/export` — user — JSON-выгрузка всех своих данных (10C).
- `DELETE /api/me` — user — `{ confirm: "DELETE" }` → D28.

**Jobs**
- `GET /api/jobs` — все — `q, category, skills[], workFormat[], employmentType[], tzOverlapWith (IANA) + minOverlap, salaryMin+currency+period+basis (фильтр применяется только к сравнимым вакансиям; несравнимые остаются, помечаются), country, source, postedWithin (1|7|30), sort (relevance|newest|salary)` → карточки (раздел 9.2). Скрытые пользователем вакансии/компании исключаются.
- `GET /api/jobs/:id` — все; не-published → 404 (кроме членов компании и админа). Imported → с `source{name,url}`, без кнопок редактирования.
- `POST /api/jobs` — member recruiter+ — создаёт `draft`; навыки только `skill_id` (+ нераспознанные → `skill_suggestions`).
- `PATCH /api/jobs/:id` — member recruiter+ — только `draft|paused|pending_moderation`; изменение published → переводит в `pending_moderation`, если компания unverified. Imported → 404 (не видна как своя).
- `POST /api/jobs/:id/publish | pause | close | extend` — по таблице 4.3.
- `POST /api/jobs/:id/save`, `DELETE /api/jobs/:id/save`, `POST /api/jobs/:id/hide` `{ reason?, scope: 'job'|'company' }`, `POST /api/jobs/:id/apply-external` (лог D8, ответ `{ externalUrl }`).
- `POST /api/jobs/:id/report` `{ reason, details? }`.

**Companies**
- `POST /api/companies` — user — создаёт компанию (`unverified`), автор = owner; проверка дубля по domain/trgm(name) ≥ 0.8 → компания создаётся, но в `moderation_queue` с флагом `possible_duplicate`.
- `GET /api/companies/:slug` — все — публичная часть + published вакансии.
- `PATCH /api/companies/:id` — owner/admin.
- `POST /api/companies/:id/logo` — owner/admin — image/png|jpeg|webp ≤ 2 MB, перекодировка sharp → webp 256×256, случайное имя.
- `POST /api/companies/:id/verification` `{ method, target }`; `POST /api/companies/:id/verification/confirm` `{ token }` (10B).

**Candidates**
- `GET /api/candidates/me`, `PATCH /api/candidates/me` (профиль, навыки, опыт, языки, предпочтения) — пересчёт `completeness` в той же транзакции.
- `GET /api/candidates/me/contacts`, `PUT /api/candidates/me/contacts` — только владелец.
- `GET /api/candidates/:id` — D24; ключа `contacts` нет никогда.

**Applications**
- `POST /api/applications` — кандидат — `{ jobId, coverNote? }`; imported → 422 EXTERNAL_APPLY; неполный профиль → 422 PROFILE_INCOMPLETE; дубль → 409 (D27).
- `GET /api/applications` — role-scoped: `?as=candidate` свои; `?as=employer&jobId=` по своим вакансиям (member).
- `GET /api/applications/:id` — кандидат-владелец или member; при открытии member-ом статус `applied` → `viewed` (идемпотентно).
- `PATCH /api/applications/:id/status` `{ to }` — через `transitionApplication`; `to='shortlisted'` → 422 (только express-interest).
- `POST /api/applications/:id/withdraw` — кандидат.
- `POST /api/applications/:id/express-interest` — member recruiter+ → tx shortlisted + reveal (D3); повтор → 200 идемпотентно.
- `GET /api/applications/:id/contacts` — member компании, статус по D23, иначе 404. Каждый вызов → `audit_logs(action='contacts.read')`.

**Matching**
- `GET /api/matches` — кандидат — `{ items:[{ job, score, explain[] }], lowData: bool }`, только score ≥ 0.55.
- `POST /api/matches/:jobId/feedback` `{ action: 'dismissed', reason? }`.

**Bot**
- `POST /api/bot/message` — гость/user — `{ conversationId?, text }` → SSE-стрим: `token`, `tool_result`, `confirm_request`, `done`.
- `POST /api/bot/confirm` — user — `{ conversationId, confirmationId, accept: bool }` (подтверждение критичного действия, TTL 10 мин, одноразово).
- `GET /api/bot/conversation` — история текущей сессии (последние 50).

**Notifications**
- `GET /api/notifications`, `POST /api/notifications/read` `{ ids[] | all }`, `GET|PUT /api/notifications/preferences`.

**Admin** (`requireAdmin`, иначе 404; каждое действие → audit_logs)
- `GET /api/admin/queue`, `POST /api/admin/queue/:id/decide` `{ decision, note }`
- `GET /api/admin/reports`, `POST /api/admin/reports/:id/decide`
- `GET /api/admin/users|companies|jobs` (поиск), `POST /api/admin/users/:id/suspend|unsuspend`, `POST /api/admin/companies/:id/suspend`, `POST /api/admin/jobs/:id/remove`
- `GET /api/admin/taxonomy/suggestions`, `POST …/:id/map|reject`
- `GET /api/admin/import/sources|runs`, `POST /api/admin/import/sources/:id/toggle`
- `GET /api/admin/metrics` (раздел 18.2), `GET /api/admin/audit`

**Cron** (`Authorization: Bearer CRON_SECRET`)
- `/api/cron/queue` (1 мин), `/api/cron/expire-jobs` (час), `/api/cron/fx-rates` (сутки),
  `/api/cron/import` (по источнику, ≥ 1 час), `/api/cron/trusted` (сутки),
  `/api/cron/digest` (сутки, по локальному утру пользователя), `/api/cron/retention` (сутки),
  `/api/cron/rate-limit-gc` (час).

---
