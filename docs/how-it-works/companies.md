# Компании — как устроено

Модуль `src/modules/companies`. Подписка кандидата на компанию — модуль `follows`, см. [job-search-tools.md](job-search-tools.md).

## Что делает

- Создание и правка компании, логотип (`setCompanyLogo`, хранилище Supabase Storage), члены команды с ролями (owner, admin, recruiter), места в команде по тарифу.
- Публичная страница компании `/companies/[slug]` (`getPublicCompany`).
- Проверка компании по домену: TXT-запись в DNS и реквизиты (`requestVerification`, `confirmVerification`, `submitIfReady`); одобряет админ (`approveCompanyVerification`). Знак «проверенная» пересчитывается кроном (`refreshTrustedFlags`).
- Поиск дублей при создании (`isPossibleDuplicate`).
- Утренние сводки для компании — включение `setOwnCompanyAgentBriefs` (сами сводки — модуль notifications).
- Заявка на задачу со страницы `/services` (engagement brief, D413, D417): человек описывает проблему, срок и контакт; список видят на `/admin/engagements`.

## Главные файлы

| Что                | Где                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Вход               | `src/modules/companies/service/index.ts`                                                        |
| Компания и команда | `service/company-service.ts`, `repo/company-repo.ts`                                            |
| Логотип            | `service/logo-service.ts`, `service/storage.ts`                                                 |
| Проверка           | `service/verification-service.ts`, `service/verification-rules.ts`, `repo/verification-repo.ts` |
| Дубли              | `service/duplicate.ts`                                                                          |
| Заявка на задачу   | `service/engagement-brief.ts`, разбор — `engagement-brief.ts`                                   |
| Интерфейс          | `ui/company-form.tsx`, `ui/employer-company-switcher.tsx`, `ui/team-seats.tsx`                  |

## Таблицы и миграции

| Таблица                                                                 | Миграция                                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `companies`, `company_members`, `employer_profiles`, `moderation_queue` | `0004_companies.sql`; поля — `0036`, `0040`, `0042`                    |
| `company_verifications`                                                 | `0014_company_verifications.sql`                                       |
| `engagement_briefs`                                                     | `0048_engagement_briefs.sql` — по MISSION_LOG на облако не применялась |

Схема: `src/db/schema/companies.ts`, `verifications.ts`, `engagement.ts`.

## Маршруты и страницы

- Страницы: `/companies/[slug]`, `/employer/company`, `/employer/company/verify`, `/employer/billing`, `/services`; админка `/admin/companies`, `/admin/companies/[id]`, `/admin/engagements`.
- API: `/api/companies`, `/api/companies/[identifier]`, `/api/companies/[identifier]/logo`, `/api/companies/[identifier]/members` (+ `[userId]`), `/api/companies/[identifier]/verification` (+ `confirm`), `/api/company/briefs`, `/api/notifications/company-agent-briefs`.
- Cron: `/api/cron/trusted` в 03:45 UTC — `refreshTrustedFlags`.

## Env (без значений)

`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` (логотипы), `RESEND_API_KEY`, `EMAIL_FROM` (письма о проверке).

## ТЗ и решения

ТЗ: [14-moderation.md](../tz/14-moderation.md) (проверка), [04-data.md](../tz/04-data.md), [30-one-account.md](../tz/30-one-account.md) §30.7.

D: 13, 84, 127, 131, 133 (проверка и доверие), 368, 413, 417 (заявка на задачу), 506, 570 (несколько компаний).

## Что не сделано

- `0048_engagement_briefs.sql` на облаке нет: заявка со `/services` не сохраняется, страница предлагает Telegram, Discord или LinkedIn.
- Находки аудита 2026-10-14: SEC-5 — `POST /api/companies/:id/members` показывает, есть ли аккаунт с почтой, без лимита и добавляет человека без согласия; SEC-8 — лимит брифов перенести в `rateRules`, чтение контактов на `/admin/engagements` писать в `audit_logs`.
- Контекст нескольких компаний (D570, P1.2) — открыт.
