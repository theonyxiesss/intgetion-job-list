# Стек и архитектура

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

## 3. СТЕК И АРХИТЕКТУРА

### 3.1 Стек (выбран, сравнение не повторять)

| Слой | Выбор | Почему |
|------|-------|--------|
| Язык | TypeScript strict везде | один язык front/back, лучшие LLM SDK, скорость MVP |
| Web | Next.js (App Router), Route Handlers, Server Components | SSR/SEO для вакансий, один деплой |
| UI | Tailwind + shadcn/ui + lucide | доступные примитивы (Radix), без своей дизайн-системы |
| Формы | react-hook-form + zod (схемы общие с API) | одна валидация на клиенте и сервере |
| Данные на клиенте | TanStack Query (только для интерактивных списков/чата) | кэш, ретраи; SC — по умолчанию |
| i18n | next-intl, префикс локали в URL (`/en`, `/ru`) | SEO страниц вакансий |
| БД | Supabase Postgres 15+, расширения `pg_trgm`, `citext`, `pgcrypto` | одна БД на всё |
| ORM/миграции | Drizzle ORM; миграции — SQL-файлы в `src/db/migrations` | единственный способ менять схему |
| Auth | Supabase Auth через `@supabase/ssr` | D7 |
| Storage | Supabase Storage (логотипы) | — |
| Очереди | pg-boss | D25 |
| Email | Resend + React Email шаблоны (RU/EN) | — |
| LLM | `LLMProvider` → Anthropic SDK | D29 |
| Тесты | vitest, Playwright. Интеграция и миграции с нуля — GitHub Actions, `supabase start` (D32). Разработка — облачный проект `intgetion-dev`, без локального Docker | D32 |
| Ошибки/логи | Sentry, pino (JSON-логи без PII) | — |

### 3.2 Modular monolith
Модули: `auth, users, candidates, companies, jobs, applications, contacts,
matching, taxonomy, bot, ingestion, notifications, moderation, admin, privacy`.

```
src/modules/<m>/
  api/        # zod-схемы запросов/ответов, маппинг DTO (что отдаём наружу)
  service/    # бизнес-логика; единственная публичная точка модуля (index.ts)
  repo/       # Drizzle-запросы; импортировать из чужих модулей ЗАПРЕЩЕНО
  schemas/    # доменные zod-типы
  __tests__/
```

- Межмодульные вызовы — только через `src/modules/<m>/service/index.ts`.
  Правило ESLint `no-restricted-imports` запрещает `**/repo/**` вне своего
  модуля; `contacts/repo` — разрешён только из `contacts/service`.
- Route Handlers тонкие: auth → zod → service → DTO → ответ.
- Модули `matching` и `ingestion` не держат состояния в памяти — готовы к
  выносу в отдельный worker.

### 3.3 Структура репозитория
```
src/app/[locale]/...        страницы (раздел 8)
src/app/api/...             REST (раздел 7)
src/app/api/cron/...        cron-эндпоинты (защищены CRON_SECRET)
src/modules/<m>/...         модули
src/db/schema/*.ts          Drizzle-схема (зеркало миграций)
src/db/migrations/*.sql     миграции
src/db/seed/                seed: навыки, демо-компании, 5k вакансий (perf)
src/lib/                    http (ошибки, ответы), auth-guards, i18n, money, tz, rate-limit, llm
src/config/                 product.ts, flags.ts, free-email-domains.ts, scam-patterns.ts
src/messages/{en,ru}.json   строки i18n
fixtures/import/<source>/   фикстуры импорта
tests/e2e/                  Playwright
evals/                      golden-набор бота
docs/  TZ_INTGETION_v6.md, ERD.md, DECISIONS.md, RUNBOOK.md, archive/
MISSION_LOG.md
.cursor/rules/spec.mdc
```

### 3.4 Производительность (бюджеты)
- `GET /api/jobs` p95 < 500 ms server-side на seed 5 000 опубликованных вакансий.
- `GET /api/matches` p95 < 1 500 ms при холодном пересчёте, < 300 ms из кэша.
- LCP < 2.5 s на 4G для `/`, `/jobs`, `/jobs/[id]`; JS главной < 150 KB gz.
- Первый токен ответа бота < 2 s (SSE-стрим).

### 3.5 Инфраструктура

**MVP (ориентир < $100/мес без LLM):**

| Компонент | Сервис | ≈ $/мес |
|-----------|--------|---------|
| Frontend + API + Cron | Vercel Pro | 20 |
| Postgres, Auth, Storage, бэкапы | Supabase Pro | 25 |
| Email | Resend (до 50k писем) | 0–20 |
| Ошибки | Sentry Developer | 0 |
| Uptime | Better Stack / UptimeRobot free | 0 |
| LLM | Anthropic API, отдельный бюджет, алерт | 30–80 |

Фоновая обработка: Vercel Cron раз в минуту дёргает `/api/cron/queue`,
который забирает пачку задач pg-boss (≤ 50 c работы). Бэкапы: ежедневные
Supabase + PITR (add-on, при запуске — OPEN QUESTION по бюджету).

**Scale (×100):** отдельный worker (Fly.io/Railway) для pg-boss, matching и
ingestion; read-replica Postgres; pgvector при `EMBEDDINGS_ENABLED=true`;
CDN для статики и логотипов; Redis — только если rate-limit в Postgres
станет узким местом (метрика: > 20% времени БД).

### 3.6 Переменные окружения (`.env.example`)
```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # только сервер, только auth-admin операции
DATABASE_URL=                       # роль app_rw
DATABASE_MIGRATION_URL=             # роль-владелец схемы, только CI/миграции
RESEND_API_KEY=
EMAIL_FROM=
ANTHROPIC_API_KEY=
LLM_MODEL_CHAT=claude-sonnet-5-5
LLM_MODEL_EXTRACT=claude-haiku-4-5-20251001
LLM_DAILY_BUDGET_USD=20
EMBEDDINGS_ENABLED=false
IMPORT_LIVE_ENABLED=false
CRON_SECRET=
SENTRY_DSN=
```
Секреты в репозитории запрещены; в CI — gitleaks.

---
