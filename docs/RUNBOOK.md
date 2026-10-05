# RUNBOOK — Эксплуатационная инструкция INTGETION JOB LIST

> Все факты сверены с кодом. Файлы-источники указаны в скобках. То, чего нет в коде или ТЗ — помечено **OPEN QUESTION**. Значения секретов **никогда не пишутся**.

---

## 1. Окружения

| Окружение                          | Описание                      | Особенности                                                                                                                                                                                                                                                                  |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Локально (Windows, без Docker)** | Разработка на машине инженера | `pnpm dev` на `http://localhost:3000`. CSRF сверяет `Origin` с `NEXT_PUBLIC_SITE_URL`. Кэш SWC выносится в `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-<агент>'` (PARALLEL_WORK.md, правило 5). Локально нет Docker и Chromium — миграции с нуля и e2e только в CI. |
| **CI (GitHub Actions)**            | Пайплайн `check` + `database` | `supabase start` → миграции с нуля → интеграционные тесты → e2e (Playwright) → Lighthouse. Работает на `ubuntu-24.04` (`.github/workflows/ci.yml`).                                                                                                                          |
| **Облачная dev-БД Supabase**       | Проект `intgetion-dev`        | Используется для интеграционных тестов разработчиков и применения миграций после слияния (только Claude Code). Роль `app_rw` для DML, `DATABASE_MIGRATION_URL` — роль-владелец схемы (scripts/db-url.mjs, scripts/apply-migrations.mjs).                                     |
| **Продакшн (Vercel)**              | Ещё не настроен               | Деплой будет настроен в подфазе 11B. Переменные окружения задаются в настройках проекта Vercel.                                                                                                                                                                              |

---

## 2. Таблица переменных окружения (из `.env.example`)

| Переменная                      | Назначение                                                               | Где взять                                                                                         | Dev                        | Prod    | Что если пусто                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | Публичный URL сайта (CSRF, ссылки в письмах)                             | Vercel (Preview/Production URL) или localhost                                                     | ✅                         | ✅      | CSRF на мутирующих запросах будет падать (Origin не совпадёт).                                                                   |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL проекта Supabase                                                     | Supabase Dashboard → Settings → API                                                               | ✅                         | ✅      | Auth и клиентская работа с Supabase не работают.                                                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key для клиентского Supabase JS                                     | Supabase Dashboard → Settings → API                                                               | ✅                         | ✅      | Тоже самое.                                                                                                                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (только сервер, auth-admin операции)                    | Supabase Dashboard → Settings → API                                                               | ✅                         | ✅      | `lookupLoginEmail` в 9A/10C возвращает `unavailable`; письма не уходят адресату; удаление аккаунта не удаляет auth-пользователя. |
| `DATABASE_URL`                  | Postgres connection string для роли `app_rw`                             | Supabase Dashboard → Settings → Database → Connection pooling (Transaction mode)                  | ✅                         | ✅      | Приложение не подключается к БД.                                                                                                 |
| `DATABASE_MIGRATION_URL`        | Postgres connection string для роли-владельца схемы (только CI/миграции) | Supabase Dashboard → Settings → Database → Connection pooling (Session mode) или прямой порт 5432 | ❌ (только CI)             | ✅ (CI) | `pnpm db:migrate` и `pnpm db:verify` падают.                                                                                     |
| `RESEND_API_KEY`                | Ключ Resend для отправки писем                                           | Resend Dashboard → API Keys                                                                       | ❌ (можно оставить пустым) | ✅      | Письма помечаются `skipped` (email-sender.ts:45–48). Никаких сетевых вызовов не происходит.                                      |
| `EMAIL_FROM`                    | Адрес отправителя (verified domain в Resend)                             | Resend Dashboard → Domains                                                                        | ❌                         | ✅      | Тоже — `skipped`. Без обоих — noop-отправитель.                                                                                  |
| `UNSUBSCRIBE_SECRET`            | Секрет для подписи токенов отписки (≥ 32 символа)                        | Сгенерировать: `openssl rand -base64 32`                                                          | ✅                         | ✅      | Токены отписки отклоняются (400), ссылки в письмах нерабочие.                                                                    |
| `ANTHROPIC_API_KEY`             | Ключ Anthropic для LLM (бот, извлечение навыков)                         | Anthropic Console → API Keys                                                                      | ❌ (бот не работает)       | ✅      | Бот отвечает ошибкой; circuit breaker может сработать.                                                                           |
| `LLM_MODEL_CHAT`                | Модель для диалога бота                                                  | По умолчанию `claude-sonnet-5-5`                                                                  | ❌                         | ✅      | Используется дефолт.                                                                                                             |
| `LLM_MODEL_EXTRACT`             | Модель для извлечения/маппинга                                           | По умолчанию `claude-haiku-4-5-20251001`                                                          | ❌                         | ✅      | Используется дефолт.                                                                                                             |
| `LLM_DAILY_BUDGET_USD`          | Дневной бюджет LLM в USD (число > 0)                                     | Бизнес-решение                                                                                    | ❌                         | ✅      | Если задано некорректно — валидация в `check-env` даст INVALID. При превышении — бот отказывает вежливо (12.5).                  |
| `EMBEDDINGS_ENABLED`            | Включить эмбеддинги/векторы                                              | `false` для MVP (D11)                                                                             | ❌                         | ❌      | Всегда `false` в MVP.                                                                                                            |
| `IMPORT_LIVE_ENABLED`           | Включить живой импорт (только по founder approval)                       | `false` для MVP (D18)                                                                             | ❌                         | ❌      | Всегда `false` до решения основателя.                                                                                            |
| `CRON_SECRET`                   | Секрет для защиты cron-эндпоинтов (≥ 32 символа)                         | Сгенерировать: `openssl rand -base64 32`                                                          | ✅                         | ✅      | Все `/api/cron/*` отвечают **404** (authorized() возвращает false, выбрасывается notFound() в route.ts).                         |
| `PRIVACY_HASH_SECRET`           | Секрет для хеширования PII в rate-limit и аудите (≥ 32 символа)          | Сгенерировать: `openssl rand -base64 32`                                                          | ✅                         | ✅      | Rate-limit ключи и аудит-хеши нестабильны; возможны коллизии.                                                                    |
| `SENTRY_DSN`                    | DSN для Sentry (ошибки/производительность)                               | Sentry Dashboard → Settings → Client Keys                                                         | ❌                         | ✅      | Ошибки не уходят в Sentry; алерты 18.1 не работают.                                                                              |

> **Важно:** В `.env.local` секреты не коммитятся (gitleaks в CI). В Vercel — через UI Settings → Environment Variables. В CI — через GitHub Secrets.

---

## 3. Миграции

### Команды

```bash
pnpm db:migrate      # node scripts/apply-migrations.mjs — применяет миграции по порядку
pnpm db:verify       # node scripts/verify-db.mjs — проверяет RLS deny-all, роль app_rw, аудит
```

### Порядок файлов (src/db/migrations/)

```
0001_enums_and_users.sql
0002_audit_and_rate_limits.sql
0003_skills.sql
0004_companies.sql
0005_candidate_profiles.sql
0006_jobs.sql
0007_fx_rates_search.sql
0008_import_runs.sql
0009_applications.sql
0011_feedback_reports.sql
0012_application_reveals.sql
0013_notifications.sql
0014_company_verifications.sql
0015_matching_results.sql
```

> **Почему нет 0010?** Номер 0010 зарезервирован под админку (подфаза 10A, `claude/10a`), но миграция 0010_* пока не создана — админка работает без новых таблиц (D80–D84). Номер 0017 свободен под 10C (приватность — тоже без миграций).

### Кто применяет к облаку

**Только Claude Code после слияния в master** (PARALLEL_WORK.md, правило 8). Агенты в своих worktree `pnpm db:migrate` на облако **не запускают** — только в CI (`supabase start`) и локально против dev-БД для проверки.

---

## 4. Cron (из `vercel.json`)

| Путь                      | Расписание (UTC)                | Что делает                                                                                                                                                                | Файл-источник                             |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `/api/cron/expire-jobs`   | `0 * * * *` (каждый час)        | Переводит вакансии в `expired` по `expires_at`                                                                                                                            | `src/app/api/cron/expire-jobs/route.ts`   |
| `/api/cron/fx-rates`      | `15 16 * * *` (ежедневно 16:15) | Обновляет курсы валют `fx_rates`                                                                                                                                          | `src/app/api/cron/fx-rates/route.ts`      |
| `/api/cron/import`        | `30 * * * *` (каждый час)       | Запускает фикстурный импорт (8A)                                                                                                                                          | `src/app/api/cron/import/route.ts`        |
| `/api/cron/trusted`       | `45 3 * * *` (ежедневно 03:45)  | Пересчитывает флаг `is_trusted` компаний (14.2)                                                                                                                           | `src/app/api/cron/trusted/route.ts`       |
| `/api/cron/notifications` | `5 * * * *` (каждые 5 мин)      | Отправляет батч уведомлений (email + in-app), чистит прочитанные > 90 дней                                                                                                | `src/app/api/cron/notifications/route.ts` |
| `/api/cron/job-expiring`  | `10 4 * * *` (ежедневно 04:10)  | Уведомляет создателей вакансий за 3 дня до истечения                                                                                                                      | `src/app/api/cron/job-expiring/route.ts`  |
| `/api/cron/retention`     | `20 3 * * *` (ежедневно 03:20)  | Удаляет старые данные по retention (17): feedback 365д, audit 365д, matching 30д, прочитанные уведомления 90д, удаляет auth-пользователей с `deleted` за последние 7 дней | `src/app/api/cron/retention/route.ts`     |
| `/api/cron/rate-limit-gc` | `14 11 * * *` (ежедневно 11:14) | Удаляет `rate_limit_counters` старше 48 часов                                                                                                                             | `src/app/api/cron/rate-limit-gc/route.ts` |

### Вызов вручную (curl)

```bash
curl -X GET "https://<домен>/api/cron/expire-jobs" \
  -H "Authorization: Bearer $CRON_SECRET"
```

> Без заголовка `Authorization: Bearer <CRON_SECRET>` — ответ **404** (во всех route.ts: `authorized()` → `notFound()`).

---

## 5. Деплой на Vercel (пошагово)

> Продакшн ещё не настроен — это OPEN QUESTION для подфазы 11B.

1. **Создать проект в Vercel**
   - Import Git Repository → `theonyxiesss/intgetion-job-list`
   - Framework Preset: Next.js
   - Root Directory: `.` (корень репо)

2. **Переменные окружения (Vercel Dashboard → Settings → Environment Variables)**
   - Добавить все из раздела 2 выше для **Production**, **Preview**, **Development**.
   - Обязательные для prod: все except `RESEND_API_KEY`, `EMAIL_FROM`, `ANTHROPIC_API_KEY`, `LLM_DAILY_BUDGET_USD` (можно добавить позже).
   - `NEXT_PUBLIC_SITE_URL` = `https://<ваш-домен>.vercel.app` (или кастомный домен).

3. **Домен**
   - Settings → Domains → Add → `intgetion.joblist` (или свой).
   - Настроить DNS (CNAME на `cname.vercel-dns.com`).

4. **Supabase Auth (Dashboard → Authentication → Settings)**
   - **Site URL**: `https://<ваш-домен>` (должен совпадать с `NEXT_PUBLIC_SITE_URL`).
   - **Redirect URLs**: `https://<ваш-домен>/auth/callback`, `https://<ваш-домен>/**`.
   - **Minimum password length**: 10 (в `supabase/config.toml` уже `minimum_password_length = 10`, в проде повторить).

5. **Resend (после покупки домена)**
   - Добавить домен в Resend, настроить SPF/DKIM.
   - Создать API Key → `RESEND_API_KEY`.
   - `EMAIL_FROM` = `noreply@<ваш-домен>` (или другой verified sender).

6. **Деплой**
   - Push в `master` → автоматический деплой (GitHub Integration).
   - Проверить `/api/health` → 200.
   - Проверить cron в Vercel Dashboard → Functions → Cron Jobs.

---

## 6. Бэкапы и восстановление Supabase (процедура по ТЗ 11B — только описание)

> **Ничего не выполнять** — только описание процедуры.

1. **Ежедневные бэкапы** — Supabase Pro делает автоматически (PostgreSQL base backup + WAL).
2. **PITR (Point-in-Time Recovery)** — аддон, включается в Supabase Dashboard → Database → Backups → Enable PITR. Позволяет восстановить на любую секунду за последние 7 дней.
3. **Восстановление (restore test)**:
   - В Supabase Dashboard → Database → Backups → выберите бэкап → Restore.
   - Укажите целевой проект (можно новый временный проект для теста).
   - После восстановления: запустите `pnpm db:verify` против восстановленной БД — проверка RLS deny-all, роль `app_rw`, аудит.
   - Проверьте критичные пользовательские сценарии: регистрация, отклик, reveal контактов.
4. **RTO/RPO**: RPO ≤ 1 сек (синхронная репликация Supabase), RTO ~ 10–30 мин (зависит от размера БД).

---

## 7. Инциденты — симптомы, где смотреть, что делать

| Инцидент                        | Симптом                                                        | Где смотреть                                                                                                  | Что делать                                                                                                                                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Письма не уходят**            | Уведомления в UI есть, email — нет; в логах `skipped`          | `src/modules/notifications/service/email-sender.ts:45–48`; Vercel Function Logs для `/api/cron/notifications` | 1) Проверить `RESEND_API_KEY` и `EMAIL_FROM` в Vercel env. 2) Проверить домен в Resend (verified, SPF/DKIM). 3) Проверить `SUPABASE_SERVICE_ROLE_KEY` — без него `lookupLoginEmail` не находит email получателя (9A/10C).                                                  |
| **Рекомендации не обновляются** | `/api/matches` отдаёт старый кэш; новые вакансии не появляются | `src/modules/matching/service/cache-rules.ts`; `matching_results.computed_at`; `algo_version`                 | 1) Проверить кэш: `computed_at` старше 6 часов или `candidate_profiles.updated_at > computed_at` → пересчёт. 2) Публикация вакансии должна ставить задачу pg-boss (6B) — проверить очередь. 3) `algo_version` инкрементится при изменении формул — проверить DECISIONS.md. |
| **429 и лимиты**                | Ответы 429 с `Retry-After`                                     | `src/lib/rate-limit.ts`; `rate_limit_counters` таблица; Sentry алерты                                         | 1) Проверить `rateRules` в rate-limit.ts — лимиты по разделам 6. 2) Для cron — `/api/cron/rate-limit-gc` чистит старые окна. 3) Если ложные срабатывания — увеличить лимиты в коде и задеплоить.                                                                           |
| **Cron отвечает 404**           | Ручной curl даёт 404                                           | Любой `src/app/api/cron/*/route.ts` → `authorized()`                                                          | 1) Проверить, что заголовок `Authorization: Bearer *** передан именно так. 2) Проверить `CRON_SECRET` в env Vercel/локально. 3) Секрет не должен содержать переносов строк.                                                                                                |
| **Ошибка 500 и x-request-id**   | 500 на любом API; в ответе заголовок `x-request-id`            | Sentry (по `x-request-id`); Vercel Function Logs; `src/lib/http/handler.ts` (если есть)                       | 1) Найти в Sentry по `x-request-id`. 2) Стек-трейс покажет модуль. 3) Если повторяемо — создать issue, откатить деплой при критическом.                                                                                                                                    |

---

## 8. Алерты (раздел 18.1 ТЗ)

> Настройка алертов в Sentry / Better Stack / UptimeRobot. Пороги и действия ниже.

| Сигнал (как в 18.1)                           | Порог алерта                                                                                        | Где смотреть (дашборд/лог)                         | Что делать (runbook-действие)                                                                                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ошибки фронт/бэк (Sentry)                     | error rate > 2% за 5 мин                                                                            | Sentry Issues / Alerts                             | 1) Открыть алерт в Sentry. 2) Найти последнюю ошибку по `x-request-id`. 3) Если новый деплой — откатить. 4) Если повторяемо — создать issue с приоритетом P1.                                                |
| Латентность API p95 (`/api/jobs`)             | p95 > 800 ms за 15 мин                                                                              | Sentry Performance / Vercel Analytics              | 1) Проверить, не упал ли репликатор. 2) `EXPLAIN ANALYZE` на медленных запросах. 3) Если FTS — проверить индексы. 4) При необходимости — масштабировать Vercel (Pro → Enterprise) или добавить read-replica. |
| Медленные запросы (pg_stat_statements)        | запрос > 500 ms в топ-10                                                                            | Supabase Dashboard → Database → Query performance  | 1) Найти запрос в pg_stat_statements. 2) Добавить недостающий индекс или переписать запрос. 3) Проверить `work_mem` / `effective_cache_size`.                                                                |
| Неудачные отклики (5xx на POST /applications) | ≥ 5 за 10 мин                                                                                       | Sentry / Vercel Function Logs                      | 1) Проверить, не упал ли Supabase. 2) Стек-трейс в Sentry покажет модуль. 3) Если миграция — откатить. 4) Если race condition — проверить `transitionApplication` транзакционность.                          |
| Бот: таймауты/ошибки LLM                      | > 5% за 15 мин                                                                                      | Sentry (bot_messages.cost_micro_usd, ошибки)       | 1) Проверить Anthropic status page. 2) Если превышен `LLM_DAILY_BUDGET_USD` — бот уже в circuit breaker (12.5). 3) Увеличить бюджет или подождать сутки.                                                     |
| Стоимость LLM                                 | > 80% `LLM_DAILY_BUDGET_USD`                                                                        | Sentry (bot_messages.cost_micro_usd суммарно)      | 1) Проверить аномальные диалоги (один юзер > 3× медианы). 2) При необходимости — временно снизить лимит сообщений в `rateRules.botUser`.                                                                     |
| Импорт                                        | 2 неудачных прогона подряд; дубли > 30% или rejected > 50% прогона                                  | Supabase Dashboard → `import_runs` таблица; Sentry | 1) Проверить `import_runs.last_status` и `error`. 2) Если источник недоступен — отключить в админке. 3) Если дубли — проверить дедуп-логику. 4) Если rejected > 50% — проверить scam-patterns.               |
| Очередь pg-boss                               | задачи старше 15 мин                                                                                | Supabase Dashboard → `pgboss` таблицы              | 1) Проверить, не завис ли worker. 2) `SELECT * FROM pgboss.job WHERE state = 'active' AND started_at < now() - interval '15 min'`. 3) Перезапустить worker при необходимости.                                |
| Подозрительная активность                     | регистрации > 5× медианы часа; > 20 откликов/час с одного аккаунта; ≥ 3 жалобы на компанию за сутки | Sentry / Supabase Auth logs / `reports` таблица    | 1) Заблокировать подозрительные IP в Supabase Auth (rate limit). 2) При ≥ 3 жалобах на компанию — авто-пауза её вакансий (уже реализовано). 3) Проверить `rateRules` — возможно, нужно ужесточить.           |
| Auth                                          | > 50 неудачных входов с IP за 10 мин                                                                | Supabase Auth logs / Sentry                        | 1) Временный бан IP в Supabase Dashboard. 2) Проверить, не атака ли это (credential stuffing). 3) Ужесточить `rateRules.login` при необходимости.                                                            |
| Uptime                                        | `/api/health` недоступен 2 мин                                                                      | Better Stack / UptimeRobot / Sentry                | 1) Проверить Vercel Status Page. 2) Если Vercel down — ждать восстановления. 3) Если свой код — откатить последний деплой. 4) Проверить DNS.                                                                 |

> **Важно:** Все алерты должны приходить в общий канал оповещений (Telegram/Slack/email дежурного). Настроить эскалацию: если не квитирован за 15 мин → следующий дежурный.

---

## 10. Ротация секретов

| Секрет                                                        | Как ротировать                                                                                                               | Последствия ротации                                                                                                                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CRON_SECRET`                                                 | 1) Сгенерировать новый (`openssl rand -base64 32`). 2) Обновить в Vercel env + GitHub Secrets. 3) Передеплой.                | Старые запланированные вызовы cron (если есть задержка) получат 404. Ручные вызовы со старым секретом — 404. Нет долгосрочных последствий.                                                                                    |
| `UNSUBSCRIBE_SECRET`                                          | 1) Сгенерировать новый. 2) Обновить в Vercel env. 3) Передеплой.                                                             | **Все существующие ссылки отписки в разосланных письмах перестанут работать** (подпись не пройдёт). Нужно либо поддерживать оба секрета периодом (код не поддерживает), либо принять, что старые ссылки сломаны.              |
| `PRIVACY_HASH_SECRET`                                         | 1) Сгенерировать новый. 2) Обновить в Vercel env + GitHub Secrets. 3) Передеплой.                                            | Rate-limit ключи (`rateKey` в rate-limit.ts) изменятся — все текущие окна сбросятся (пользователи получат «свежие» лимиты). Аудит-хеши (`audit_logs.ip_hash`) для новых записей будут другими; старые не совпадут при поиске. |
| `SUPABASE_SERVICE_ROLE_KEY`                                   | 1) В Supabase Dashboard → Settings → API → Reset service role key. 2) Обновить в Vercel env + GitHub Secrets. 3) Передеплой. | `lookupLoginEmail` перестанет работать до обновления env → письма не уйдут адресатам. Удаление аккаунта не удалит auth-пользователя. Критично — обновлять быстро.                                                             |
| `ANTHROPIC_API_KEY`                                           | 1) В Anthropic Console → Regenerate key. 2) Обновить в Vercel env. 3) Передеплой.                                            | Бот перестанет отвечать до обновления.                                                                                                                                                                                        |
| `RESEND_API_KEY`                                              | 1) В Resend → Regenerate API Key. 2) Обновить в Vercel env. 3) Передеплой.                                                   | Письма станут `skipped` до обновления.                                                                                                                                                                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → Reset keys. Обновить везде.                                                            | Auth полностью сломается до обновления всех env. Требует координированного деплоя.                                                                                                                                            |

---

## 11. Чек-лист перед запуском (pre-launch)

- [ ] Все переменные из раздела 2 заданы в Vercel (Production/Preview/Development).
- [ ] `pnpm lint` → 0
- [ ] `pnpm typecheck` → 0
- [ ] `pnpm test` → 0 (unit + integration)
- [ ] `pnpm format:check` → 0 (только свои файлы, см. ниже)
- [ ] `pnpm db:verify` против dev-БД → RLS deny-all на всех таблицах, `app_rw` без DDL, аудит append-only.
- [ ] Миграции применяются с нуля в CI (`supabase start`) — зелёный job `database`.
- [ ] `CRON_SECRET`, `UNSUBSCRIBE_SECRET`, `PRIVACY_HASH_SECRET` ≥ 32 символов, сгенерированы криптографически.
- [ ] Supabase Auth: Site URL = `NEXT_PUBLIC_SITE_URL`, Redirect URLs включают `/auth/callback`.
- [ ] Supabase Auth: `minimum_password_length = 10`.
- [ ] Resend: домен verified, SPF/DKIM настроены, `EMAIL_FROM` на этом домене.
- [ ] `ANTHROPIC_API_KEY` валиден, бюджет `LLM_DAILY_BUDGET_USD` задан.
- [ ] Sentry DSN задан, алерты 18.1 настроены.
- [ ] Cron jobs в Vercel Dashboard видны и соответствуют `vercel.json`.
- [ ] Проверен restore-тест БД (пункт 6) — успешно восстановлено на тестовом проекте.
- [ ] `MISSION_LOG.md` и `docs/DECISIONS.md` актуальны (D191–D196 записаны).

---

## 12. Формат:check на Windows

> Prettier на Windows ругается на CRLF во **всех** файлах. Проверять только **свои** файлы:

```bash
# Для RUNBOOK и скриптов проверки env:
npx prettier --check docs/RUNBOOK.md scripts/check-env.mjs scripts/env-rules.mjs scripts/env-rules.d.mts src/lib/env-rules.test.ts package.json
```

Не запускать `pnpm format:check` на всем репо — он упадёт на чужих файлах с CRLF.

---

## 13. Firewall: поисковые боты и обход каталога

Ловушка и лимит гостевого API уже есть (D218). Этот раздел их не повторяет. Правило в панели ставит основатель, не агент. Проект `intgetion-job-list`.

Vercel Firewall не делает обратный DNS. Проверка Googlebot, Bingbot и YandexBot по обратному DNS — это определение «проверенного бота» у самих поисковиков: имя заканчивается на `.googlebot.com` / `.google.com`, `.search.msn.com`, `.yandex.ru` / `.yandex.net` / `.yandex.com`, и прямой DNS этого имени возвращает тот же IP. В панели ближайшее к этому — список verified bots у Vercel (он как раз так и проверяет известных ботов) плюс отдельный пропуск, если Яндекса в списке нет.

1. Firewall → Configure → Bot Management. Включить защиту так, чтобы verified bots (Google, Bing и кто ещё есть в списке Vercel) не получали challenge и не попадали под лимит ниже. Сначала режим Log, не Challenge на весь сайт: иначе пропадёт индексация.
2. Custom Rules → правило **пропуска** выше лимита. Если YandexBot нет среди verified bots: условие User-Agent содержит `YandexBot`, действие Bypass. Это слабее обратного DNS: User-Agent можно подделать. Пока Яндекс не в списке Vercel, так и оставить и не считать это полной проверкой.
3. Custom Rules → **лимит** ниже пропуска. Условие: путь соответствует `^/(en|ru)/jobs($|/)` (каталог, вакансия, подборки `/jobs/t/`). Действие: Rate Limit, 30 запросов за 10 секунд на IP. Verified bots и правило из шага 2 до этого лимита не доходят.
4. Не ставить тот же лимит на `/api/`: у гостевого API уже 120 запросов в минуту (D218). Не закрывать `/robots.txt` и `/sitemap.xml`.
5. Проверка: обычный браузер листает каталог; `curl` с User-Agent `Mozilla/5.0` пачкой на `/en/jobs` начинает получать 429; запрос с User-Agent `Googlebot` с адреса, который Vercel считает verified, проходит. Откат: выключить оба custom rule, Bot Management вернуть как было.

---

_Документ актуален на момент подфазы 11B (ветка `hermes/runbook`). Обновлять при изменениях инфраструктуры._
