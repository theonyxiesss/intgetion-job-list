# MISSION_LOG

## [2026-10-02] — 0A — DONE

- Сделано: каркас Next.js (App Router, TypeScript strict, pnpm), ESLint (запрет чужого `repo`, `contacts/repo` только из `contacts/service`, jsx-a11y recommended как error), Prettier, Vitest, каркас Playwright, CI (lint, format:check, typecheck, test, build, gitleaks), `.env.example`, структура каталогов раздела 3.3, константа `PRODUCT_NAME`, `.cursor/rules/spec.mdc`. ТЗ лежит в `docs/TZ_INTGETION_v6.md`. Списки `FREE_EMAIL_DOMAINS` и `SCAM_PATTERNS` пустые и политикой не являются: их наполняют подфазы 10B и 8A. Главная — заглушка с названием; оболочка UI — подфаза 0C.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (2 files, 8 tests); `pnpm build` → 0; `pnpm format:check` → 0. gitleaks локально не запускался: бинарника нет, шаг есть в `.github/workflows/ci.yml`. `pnpm test:e2e` не входил в DoD 0A, браузеры Playwright не ставились.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `prettier.config.mjs`, `vitest.config.mts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `.env.example`, `.gitignore`, `.cursor/rules/spec.mdc`, `docs/TZ_INTGETION_v6.md`, `docs/DECISIONS.md`, `src/config/*`, `src/modules/*/service/index.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/messages/{en,ru}.json`, `tests/e2e/home.spec.ts`, `eslint-rules/*`, каталоги раздела 3.3
- Отклонения от ТЗ: npm-имя пакета `intgetion-job-list`, потому что имя папки репозитория невалидно для npm. Запись D31 в `docs/DECISIONS.md`. Реестр D1–D30 в этот файл ещё не скопирован — это задача 0B.
- OPEN QUESTION: нет
- Следующая подфаза: 0B

## [2026-10-02] — 0B — DONE

- Сделано: D33 (автономный режим) и D34. Облачный проект `intgetion-dev` (`hwcdscobnmxatmjbmect`, eu-central-1). Роли `migrator` и `app_rw`, пароли и `CRON_SECRET` только в `.env.local`. Миграция `0001_enums_and_users.sql` применена на облако и повторно (already applied). `pnpm db:verify` подтвердил `app_rw` и RLS deny-all. `GET /api/health` под `app_rw` вернул `{"ok":true}` HTTP 200. CI с нуля остаётся job `database`.
- Команды проверки: `pnpm format:check` → 0; `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (3 files, 11 tests); `pnpm test:integration` → 0 (1 file, 2 tests, облако); `pnpm build` → 0; `pnpm db:migrate` → 0, повтор → 0; `pnpm db:verify` → 0; `curl http://127.0.0.1:3000/api/health` → 0, HTTP 200 `{"ok":true}`. `gh run watch 37068940015` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37068940015 — jobs `check` и `database` success.
- P-тесты подфазы: нет
- Миграции: `src/db/migrations/0001_enums_and_users.sql` на `intgetion-dev` и в CI
- Изменённые файлы: `docs/DECISIONS.md`, `docs/TZ_INTGETION_v6.md`, `MISSION_LOG.md`, `scripts/db-url.mjs`, `scripts/apply-migrations.mjs`, `scripts/verify-db.mjs`, `src/db/client.ts`, `src/db/ssl.ts`, `src/db/rls.integration.test.ts`
- Отклонения от ТЗ: D32 (нет локального Docker), D33 (автономный режим), D34 (`migrator` вместо смены пароля `postgres`; TLS без проверки цепочки для пулера)
- OPEN QUESTION: нет
- Следующая подфаза: 0C

## [2026-10-03] — 0C — DONE

- Сделано: next-intl с префиксом `/en` и `/ru`. Шапка, футер, тема `prefers-color-scheme` с переключателем, главная из статических блоков раздела 9.1, локализованные 404/500, eslint-запрет хардкода в JSX. Категории — весь список 11.1 (D35). Блок вакансий — пустое состояние. Неизвестный путь внутри локали вызывает `notFound()`.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (5 files, 13 tests); `pnpm format:check` → 0; `pnpm build` → 0. Локально `GET /en` и `GET /ru` → 200, слоган и название в HTML. Локальный `pnpm test:e2e` → 1: таймаут скачивания Chromium с cdn.playwright.dev (две попытки). `gh run watch 37071580945` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37071580945 — jobs `check` и `database` success. В CI e2e 4 passed, axe без critical, Lighthouse LCP `lcp_ms 2069.3522`.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/app/[locale]/**`, `src/components/shell/**`, `src/i18n/**`, `src/messages/**`, `src/proxy.ts`, `eslint-rules/no-hardcoded-jsx-text.*`, `tests/e2e/home.spec.ts`, `scripts/ci-ui.sh`, `.github/workflows/ci.yml`, `next.config.ts`, `docs/DECISIONS.md`
- Отклонения от ТЗ: D35
- OPEN QUESTION: нет
- Следующая подфаза: 1A

## [2026-10-03] — fix: TLS к пулеру — DONE

- Сделано: вместо `rejectUnauthorized: false` клиенты (`src/db/ssl.ts`, `scripts/db-url.mjs`) проверяют цепочку по закреплённому `Supabase Root 2021 CA` (D36). Loopback-проверка теперь распознаёт `[::1]`: `URL.hostname` для IPv6 возвращает адрес в скобках.
- Команды проверки: `pnpm db:verify` → 0 с проверкой цепочки; подключение `app_rw` через `postgres` с `hostedSsl()` → успех; без закреплённого CA пулер отклонён с `SELF_SIGNED_CERT_IN_CHAIN`.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/db/ssl.ts`, `src/db/ssl.test.ts`, `src/db/supabase-root-2021-ca.pem`, `scripts/db-url.mjs`, `docs/DECISIONS.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: D36
- OPEN QUESTION: нет
- Следующая подфаза: 1A

## [2026-10-03] — 1A — DONE

- Сделано: Supabase Auth через `@supabase/ssr`. Регистрация паролем и magic link (`POST /api/auth/register`, terms в metadata до подтверждения), `/[locale]/auth/callback` (PKCE `code` и `token_hash`) создаёт `users` с `terms_version`/`terms_accepted_at`, `POST /api/auth/logout`, `POST /api/auth/reset` (всегда 200), `POST /api/auth/password` (D37.5), `GET`/`PATCH /api/me`. Страницы `/login` (пароль и magic link), `/register`, `/reset-password` (запрос и новый пароль), `/auth/check-email`; в шапке «Войти/Регистрация» или «Выйти». Обновление сессии в `src/proxy.ts` до next-intl. Пароль ≥ 10, ≤ 72, блок-лист (D37.7). Неподтверждённый email = нет сессии → 401 на любой записи. e2e, axe и Lighthouse перенесены в CI-job `database` (D37.10).
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (9 files, 50 tests); `pnpm format:check` → 0; `pnpm build` → 0 (с env и без env Supabase; локально нужен `SWC_NATIVE_BINDING_CACHE`, см. ниже); `pnpm test:integration` на облачной БД → 0 (2 files, 3 tests). Локальный smoke `pnpm start`: страницы auth 200, `GET`/`PATCH /api/me` без сессии → 401, слабый пароль → 400 `password_too_common`, callback без кода → 307 на `/login?error=invalid_link`. `gh run watch 37075798107` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37075798107 — `check` и `database` success; e2e 12 passed (регистрация+вход паролем, регистрация+вход magic link, сброс пароля, неподтверждённый email: вход отклонён и `PATCH /api/me` → 401, валидация, axe для `/en`, `/en/login`, `/en/register`, `/en/reset-password`), gitleaks без находок, `lcp_ms 1684`. Первый прогон 37075099417 упал: локатор `role=alert` совпал с route announcer Next.js; gitleaks `generic-api-key` на тестовом пароле — исправлено в `41d87a3`.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/app/[locale]/{login,register,reset-password,auth/check-email}/page.tsx`, `src/app/[locale]/auth/callback/route.ts`, `src/app/api/auth/{register,reset,logout,password}/route.ts`, `src/app/api/me/route.ts`, `src/components/auth/**`, `src/components/shell/header.tsx`, `src/lib/supabase/**`, `src/lib/http/{errors,handler,index}.ts`, `src/modules/auth/**`, `src/config/legal.ts`, `src/proxy.ts`, `src/app/globals.css`, `src/messages/{en,ru}.json`, `supabase/config.toml`, `tests/e2e/{auth.spec,mail,home.spec}.ts`, `playwright.config.ts`, `scripts/ci-db.sh`, `scripts/ci-ui.sh`, `.github/workflows/ci.yml`, `.gitleaksignore`, `package.json`, `pnpm-lock.yaml`, `docs/DECISIONS.md`
- Отклонения от ТЗ: D37 (детали auth-потока, эндпоинт `POST /api/auth/password`, `marketingOptIn` в `/api/me`)
- OPEN QUESTION: нет новых. Действие пользователя для облачного проекта `intgetion-dev` (Dashboard → Authentication): Redirect URLs `http://localhost:3000/**`, Site URL `http://localhost:3000`, минимальная длина пароля 10. Подтверждение email уже включено (`mailer_autoconfirm: false`). Встроенный SMTP Supabase ограничен несколькими письмами в час — для реальных писем нужен свой SMTP (Resend, 9A / OPEN QUESTION 25.3). Локально `pnpm build` требует `SWC_NATIVE_BINDING_CACHE` вне `AppData` из-за ACL этой папки.
- Следующая подфаза: 1B

## [2026-10-03] — 1B — DONE (ветка `claude/1b`, ждёт слияния в master)

- Сделано: guards `requireUser` / `requireAdmin` / `requireCandidate` / `requireMembership` (`src/lib/auth-guards.ts`, D38.2); миграция 0002 — `audit_logs` (для `app_rw` без UPDATE) и `rate_limit_counters`; лимиты раздела 6 для входа, magic link/сброса и регистрации, 429 `RATE_LIMITED` с `Retry-After` (D39.2); вход паролем и magic link перенесены на сервер — `POST /api/auth/login`, `POST /api/auth/magic-link` (D38.1); аудит входов админа; CSRF-проверка `Origin` для мутирующих `/api/*` в proxy; CSP с nonce на запрос для страниц, CSP для API, HSTS / nosniff / X-Frame-Options / Referrer-Policy / Permissions-Policy, без `X-Powered-By` (D39.4); `/api/cron/rate-limit-gc` под `CRON_SECRET`; `db:verify` проверяет deny-all RLS на всех таблицах `public`. Исправлен matcher proxy из 1A — он срабатывал только на `/` (D39.7).
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (12 files, 82 tests); `pnpm format:check` → 0; `pnpm build` → 0 (с env и без env Supabase); gitleaks локально → no leaks. Локальный smoke `pnpm start`: CSP с nonce на `/en`, все inline-скрипты с этим nonce, POST с чужим `Origin` и без `Origin` → 403, с `Origin` сайта → 400 (валидация), `/api/health` с `default-src 'none'`, cron без секрета → 404; в браузере на `/en/login` и `/ru/register` нарушений CSP нет. `gh run watch 37105625515` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37105625515 — `check` и `database` success; `db:verify`: deny-all на 3 таблицах, `audit_logs` append-only; интеграция 3 files / 8 tests; e2e 19 passed; `lcp_ms 2237`. Первый прогон 37105286228 упал: тест ждал текст `permission denied`, а Drizzle оборачивает ошибку — теперь проверяется SQLSTATE 42501 в `cause`.
- P-тесты подфазы: P12 ✅ (e2e: чужой Origin, без Origin, чужой порт → 403; unit `isAllowedOrigin`), P15 ✅ (e2e: 4-й сброс на email и 6-й вход → 429 + `Retry-After`; интеграция лимитера на БД)
- Миграции: `src/db/migrations/0002_audit_and_rate_limits.sql` (в CI с нуля и повторно; на облако — после слияния в master)
- Изменённые файлы: `src/db/migrations/0002_audit_and_rate_limits.sql`, `src/db/schema/{infra,index}.ts`, `src/lib/{auth-guards,audit,rate-limit,origin,privacy-hash,request-ip,security-headers}.ts`, `src/lib/http/{errors,index}.ts`, `src/proxy.ts`, `next.config.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/auth/callback/route.ts`, `src/app/api/auth/{login,magic-link,register,reset}/route.ts`, `src/app/api/cron/rate-limit-gc/route.ts`, `src/modules/auth/{schemas,service}/**`, `src/components/auth/{login-form,fields}.tsx`, удалён `src/lib/supabase/browser.ts`, тесты `src/lib/{auth-guards,security}.test.ts`, `src/lib/infra.integration.test.ts`, `src/proxy.test.ts`, `src/modules/auth/__tests__/auth-service.test.ts`, `tests/e2e/{security,auth}.spec.ts`, `scripts/{verify-db.mjs,ci-db.sh}`, `.env.example`, `docs/{DECISIONS,ERD}.md`
- Отклонения от ТЗ: D38 (вход на сервере, guards с функциями поиска до 2B/3A), D39 (HMAC-ключи с `PRIVACY_HASH_SECRET`, глобальный лимит 300/мин — в 11A, детали CSP)
- OPEN QUESTION: нет. Действия: после слияния в master — `pnpm db:migrate` на облако; добавить `PRIVACY_HASH_SECRET` в окружение деплоя (локально уже в `.env.local`). Локально CSRF сверяет `Origin` с `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000`), поэтому приложение открывать по `localhost`, не `127.0.0.1`. LCP вырос с 1684 до 2237 мс: proxy теперь реально работает и проверяет сессию на каждой странице; бюджет 2500 соблюдён, запас небольшой — пересмотреть в 11A.
- Следующая подфаза: после слияния 1B и 2A доступны 2B (зависит от 2A, 1B) и 3A (зависит от 1B)

## [2026-10-03] — 2A — DONE

- Сделано: таблицы `skills`, `skills_aliases`, `skill_suggestions` (миграция `0003`, RLS deny-all, DML для `app_rw`), `pg_trgm` в схеме `extensions` и обёртка `public.skill_similarity`. Идемпотентный bootstrap 100 канонических навыков в 10 категориях, у каждого `name_en`, `name_ru` и не меньше 2 алиасов. `normalizeSkill`: lower/trim, версии и пунктуация, алиас → slug → trgm ≥ 0.85 с одним кандидатом, иначе `skill_suggestions` (повтор увеличивает `occurrences`). Модуль `src/modules/taxonomy`, наружу только `service/index.ts`. LLM-маппинг не делался. Миграция на облако не применялась.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (до rebase: 12 files, 65 tests; после rebase на master с 1B: 15 files, 97 tests); `pnpm exec prettier --check` по файлам 2A → 0; `pnpm build` → 0 (Git Bash, `SWC_NATIVE_BINDING_CACHE=$PWD/node_modules/.cache/swc`). `pnpm format:check` локально → 1: Prettier ругается на файлы из HEAD из-за CRLF в рабочей копии Windows; эти файлы коммит не меняет. `pnpm db:migrate` и `pnpm test:integration` локально не запускались: миграцию 0003 нельзя применять к облаку до вливания в master. `gh run watch 37106813853` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37106813853 — `check` и `database` success до rebase. После rebase на `origin/master` (там уже 1B): `gh run watch 37107264113` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37107264113 — `check` и `database` success; миграции 0001–0003 с нуля, integration и e2e в job `database`.
- P-тесты подфазы: нет
- Миграции: `src/db/migrations/0003_skills.sql` (в CI с нуля; на `intgetion-dev` не применялась)
- Изменённые файлы: `src/db/migrations/0003_skills.sql`, `src/db/schema/skills.ts`, `src/db/schema/index.ts`, `src/db/seed/skills.ts`, `src/modules/taxonomy/**`, `docs/DECISIONS.md`, `docs/ERD.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: D42 (механика нормализации, источник suggestion по умолчанию `user`, повтор seed не удаляет строки и не сбрасывает `is_active`)
- OPEN QUESTION: нет
- Следующая подфаза: 2B

## [2026-10-03] — интеграция 1B + 2A в master — DONE

- Сделано: `claude/1b` и `cursor/2a` влиты в `master` (fast-forward). Ревью Antigravity по обеим веткам — без замечаний. Миграции 0002 и 0003 применены к `intgetion-dev`. На облаке 0003 сначала упала (`permission denied for database postgres`): роль `migrator` не может создавать схемы/расширения в `extensions`. Роль `postgres` один раз установила `pg_trgm` 1.6 и выдала `app_rw` USAGE на `extensions`; шаги в 0003 и в её генераторе `src/db/seed/skills.ts` стали условными (D40).
- Команды проверки: облако — `pnpm db:migrate` → 0 (`applied: 0003_skills.sql`), `pnpm db:verify` → 0 (deny-all на 6 таблицах); интеграционные тесты 2A против облака → 4 passed (с `--testTimeout 120000`: с таймаутом 5 с падают из-за сетевой задержки до eu-central-1, не из-за прав). `gh run watch 37108282855` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37108282855 — миграции с нуля и повторно, e2e 19 passed, `lcp_ms 2435`.
- Миграции: `0003_skills.sql` изменена до первого применения на облаке (D40)
- Отклонения от ТЗ: D40
- OPEN QUESTION: нет. Риск: LCP главной 2228–2435 мс при бюджете 2500 — на странице два сетевых вызова Supabase Auth (proxy и шапка). Разобрать до 4A.
- Следующая подфаза: 3A (Codex), 2B (Cursor)

## [2026-10-03] — 3A — DONE (ветка `codex/3a`)

- Сделано: миграция `0004_companies.sql` для компаний, memberships, профилей работодателя и `moderation_queue`; API создания, публичного просмотра, редактирования и загрузки логотипа; сервис прав с `findMemberRole`; поиск дублей по домену и similarity ≥ 0.8; `/onboarding` и `/employer/company`; en/ru строки; audit записи смены статуса; unit, DB integration и P2 e2e тесты.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (17 files, 110 tests после rebase); `pnpm build` → 0; изменённые файлы проходят Prettier. GitHub Actions run `37110069016` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37110069016 — `check` и `database` success; полный `pnpm format:check` зелёный; миграция 0004 с нуля и повторно; integration 16 passed; e2e 20 passed; `lcp_ms 2434.2742`. `pnpm format:check` целиком локально ранее ругался на 124 неизменённых CRLF-файла при `core.autocrlf=true`.
- P-тесты подфазы: P2 ✅ (e2e: владелец создаёт/редактирует компанию, другой пользователь получает 404).
- Миграции: `src/db/migrations/0004_companies.sql` (RLS deny-all; `pg_trgm` из 0003; применена с нуля и повторно в CI).
- Изменённые файлы: `src/db/migrations/0004_companies.sql`, `src/db/schema/{companies,index}.ts`, `src/modules/companies/**`, `src/app/api/companies/**`, `src/app/[locale]/{onboarding,employer/company}/**`, `src/messages/{en,ru}.json`, `tests/e2e/company.spec.ts`, `package.json`, `pnpm-lock.yaml`, `docs/{DECISIONS,ERD}.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: D50 — domain не unique, чтобы при совпадении домена создать компанию и поставить possible_duplicate; D51–D54 — таблицы/RLS, права, logo pipeline и employer UI.
- OPEN QUESTION / BLOCKED: загрузка в Supabase Storage не проверена и недоступна без `SUPABASE_SERVICE_ROLE_KEY`; серверная валидация, Sharp-конвертация и адаптер Storage с тестовым двойником готовы.
- Следующая подфаза: 3B.

## [2026-10-03] — интеграция 3A в master — DONE

- Сделано: `codex/3a` перебазирована на `master` (только документы впереди) и влита. Проверено при приёме: CI зелёный на голове ветки (37112664268), чужих файлов нет, RLS deny-all на всех новых таблицах, DTO компании — явный allowlist (без `legal_name`, `registration_number`, `created_by`), права по 5.1 (чужая → 404, без роли → 403, imported → 422 `IMPORTED_READONLY`), логотип — сигнатура MIME + `sharp` с лимитом пикселей. Миграция 0004 применена к `intgetion-dev`.
- Команды проверки: облако — `pnpm db:migrate` → 0 (`applied: 0004_companies.sql`), `pnpm db:verify` → 0 (deny-all на 10 таблицах). `gh run watch 37113169907` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37113169907 — e2e 21 passed, медиана LCP 1705 мс.
- Миграции: `0004_companies.sql`
- Отклонения от ТЗ: D50 (Codex)
- OPEN QUESTION: нет. BLOCKED: загрузка логотипа в Supabase Storage — нужен `SUPABASE_SERVICE_ROLE_KEY` (действие пользователя).
- Замечания на потом (не блокируют): `GET /api/companies/:slug` отдаёт компанию в любом статусе, включая `suspended`/`rejected` — решить в 10A вместе со сменой статусов; `POST /api/companies/:id/logo` читает всё тело через `formData()` до проверки 2 МБ — ограничить размер тела в 11A.
- Следующая подфаза: 3B (Codex)

## [2026-10-03] — 4A-lib — DONE

- Сделано: `src/lib/money.ts` — суммы только bigint в минорных единицах (D19), DTO раздела 6 с разбором и отказом на мусоре, year→month с банковским округлением (hour не приводится), fx через USD fixed point 8 знаков из numeric(18,8)-строк, свежесть курса 7 суток, сравнимость D4/D5 с причиной (`basis | period | fx_missing | fx_stale`), скор 10.4.4 из точного BigInt-отношения, явные нейтральные случаи (D65–D69). `src/lib/tz.ts` — только IANA-зоны через Intl (фиксированные смещения отклоняются), `localToUtc` подбором смещения на дату с правилами для несуществующего/повторяющегося времени в день перехода DST (D65), `workHoursOverlap` по 10.6: дни по календарю UTC, workDays — ISO weekday, окна вакансии по умолчанию 09:00–18:00, окна через полночь, среднее пересечение в минутах на рабочий день и разбивка по дням (D68). Новых зависимостей нет — только Intl и BigInt; BigInt-литералы не используются (target ES2017).
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 151 passed (18 файлов; из них 51 новый тест: money 31, tz 20), ветки обоих модулей покрыты; `pnpm format:check` на файлах подфазы → 0 (по всему репозиторию локально падает — см. отклонения); `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-glm' pnpm build` → 0.
- P-тесты подфазы: нет (lib-подфаза без API/UI; P-кейсы зарплаты и tz входят в 4A/6A).
- Миграции: нет.
- Изменённые файлы: `src/lib/money.ts`, `src/lib/tz.ts`, `src/lib/money.test.ts`, `src/lib/tz.test.ts`, `docs/DECISIONS.md` (D65–D69), `MISSION_LOG.md`.
- Отклонения от ТЗ: (1) локальный `pnpm format:check` падает на 151 файле репозитория, включая нетронутые: `core.autocrlf=true` даёт CRLF на диске, а prettier требует LF; на LF-checkout CI шаг зелёный, файлы подфазы отформатированы prettier. (2) В `money.test.ts` исправлен собственный тест с неверным ожиданием (1100 EUR × 1.1 = 1210 USD, а не 1000; январь Lord_Howe — DST +11:00, а не +10:30): код не менялся. (3) tz: пересечение с окном вакансии дня d+1 для окон кандидата через полночь — D68.3.
- OPEN QUESTION: нет.
- Следующая подфаза: 4A (`glm/4a`), зависит от 3B.

## [2026-10-03] — 2B — DONE (ветка `cursor/2b`, ждёт слияния в master)

- Сделано: таблицы кандидата (`candidate_profiles`, `candidate_skills`, `candidate_experience`, `candidate_languages`, `candidate_preferences`, `candidate_contacts`), RLS через `public.enable_rls_deny_all()`. Модули `candidates` и `contacts`: контакты наружу только через `contactsService`. `hasCandidateProfile(userId)` экспортирован для `requireCandidate`. `GET/PATCH /api/candidates/me` (полнота в той же транзакции), `GET/PUT /api/candidates/me/contacts`, `GET /api/candidates/:id` только владельцу (иначе 404, ключа `contacts` нет). Навыки только через `normalizeSkill`, не больше 30, нераспознанные — в `skill_suggestions`. Полнота 11.3, сумма 100. Timezone — IANA из браузера с подтверждением. Страницы `/profile` и `/profile/edit`. `GET /api/me` не менялся: `hasCandidateProfile` по-прежнему `false` в `meContext` (`src/app/api/me/route.ts`, D46). Claude Code подставляет `hasCandidateProfile(user.id)` из `@/modules/candidates/service`.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (21 files, 129 tests); `pnpm exec prettier --check` по своим изменённым файлам → 0; `pnpm build` → 0 (`SWC_NATIVE_BINDING_CACHE=C:\Users\Admin\.swc-cache-cursor`). `pnpm format:check` целиком локально не зелёный из-за CRLF рабочей копии. `pnpm db:migrate` и интеграция локально не запускались: 0005 на облако не применялась. До rebase `gh run watch 37118467512` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37118467512 — `check` и `database` success. Прогоны до этого: 37114272095 (CHECK с подзапросом), 37114589505 (e2e не нашёл поле Timezone), 37118007473 (prettier, job `database` уже зелёный). После rebase на `e491bb2` (D46): `gh run watch 37119025500` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37119025500 — `check` и `database` success.
- P-тесты подфазы: P1 ✅ (интеграция: чужой `getCandidateForViewer` → 404, в ошибке нет email; e2e: кандидат B получает 404, в теле нет контактов и ключа `contacts`)
- Миграции: `src/db/migrations/0005_candidate_profiles.sql` (в CI с нуля и повторно; на `intgetion-dev` не применялась). CHECK желаемых должностей — `public.candidate_titles_valid`.
- Изменённые файлы: `src/db/migrations/0005_candidate_profiles.sql`, `src/db/schema/{candidates,index}.ts`, `src/modules/candidates/**`, `src/modules/contacts/**`, `src/app/api/candidates/**`, `src/app/[locale]/profile/**`, `src/components/profile/profile-form.tsx`, `src/components/shell/header.tsx`, `src/messages/{en,ru}.json`, `tests/e2e/profile.spec.ts`, `docs/{DECISIONS,ERD}.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: D55 (что считать подтверждёнными часами и форматом), D56 (до 5A профиль виден только владельцу; страницы открыты любому подтверждённому пользователю), D57 (длины и `candidate_titles_valid`), D58 (навыки через `normalizeSkill`, максимум 30), D59 (две транзакции без цикла импортов; `GET /api/me` не переключался)
- OPEN QUESTION: нет
- Следующая подфаза: 5A после 3B. Для этого агента — стоп до явной команды.

## [2026-10-03] — 3B — DONE (ветка `codex/3b`)

- Сделано: миграция `0006_jobs.sql` и Drizzle-схема вакансий; сервис CRUD, skills/languages и история статусов; единая машина переходов 4.3, publish по D12, risk-score 14.3; API работодателя, cron истечения и страницы `/employer/jobs*` с en/ru строками. Очередь модерации получает publish/risk flags; UI очереди остаётся 10A.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (25 files, 187 tests); сборка с `SWC_NATIVE_BINDING_CACHE=C:\Users\Admin\.swc-cache-codex` → 0; Prettier по изменённым TS/JS/JSON/MD → 0. Полный локальный `pnpm format:check` на Windows затронут CRLF базовых файлов; полный `format:check` CI зелёный. GitHub Actions `37120795078` → 0: [check и database success](https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37120795078).
- P-тесты подфазы: P2 ✅ (e2e: чужой работодатель PATCH draft-вакансии → 404); интеграционные CRUD/status history прошли (1 test); e2e 23 passed; Lighthouse LCP median 1600.1789 ms.
- Миграции: `src/db/migrations/0006_jobs.sql` (deny-all RLS; 0001–0006 применились с нуля и повторно в CI; облако не менялось).
- Отклонения от ТЗ: нет. После появления `src/lib/money.ts` во время rebase 3B подключила `toMoneyDto`; outlier сравнивается с медианой exact numeric без floating point. D60–D64 — схема, статусная машина, risk-score и лимиты/cron.
- OPEN QUESTION: нет. BLOCKED: нет.
- Следующая подфаза: 4A / 4A-lib.

## [2026-10-03] — 10A (первая часть) и интеграция 3B — DONE

- 10A, первая часть (Claude Code, D80): `/[locale]/admin` (обзор, пользователи, журнал аудита, предложенные навыки), `/api/admin/users` + suspend/unsuspend, `/api/admin/audit`, `/api/admin/taxonomy/suggestions` + map/reject; map добавляет алиас, и `normalizeSkill` находит навык; каждое действие админа пишет `audit_logs`; назначение админа — `pnpm admin:grant <email>` (D21). P7 ✅ (e2e: гость и обычный пользователь — 404 на страницах и API), P16 ✅ (e2e: блокировка → у пользователя 401, запись в журнале; unit — аудит на каждое действие). CI ветки 37121410798 → 0, e2e 24 passed.
- 3B (Codex): принята после ревью. Права по 5.1 (чужая вакансия → 404 через выборку по членству, член без роли → 403, imported → 404), лимиты создания через `rateRules`, деньги через `src/lib/money.ts`, `vercel.json` с cron `expire-jobs`. При интеграции исправлено: DTO вакансии и страница работодателя отдавали `risk_score`/`risk_flags` — запрещено 5.3; добавлен тест набора ключей DTO; восстановлен JSON сообщений после склейки при rebase. Миграция 0006 применена к `intgetion-dev`.
- Команды проверки: `pnpm db:migrate` → 0 (`applied: 0006_jobs.sql`), `pnpm db:verify` → 0 (deny-all на 20 таблицах); CI `claude/integrate-3b` 37122419421 → 0: миграции с нуля, e2e 25 passed, медиана LCP 2051 мс; unit 199 passed.
- Замечание на потом (не блокирует): в 3B бизнес-логика (`createJob`, `updateJob`, переходы) живёт в `repo/jobs-repo.ts`, а сервис только реэкспортирует её — расходится с 3.2 (repo — только запросы). Перенести в `service/` при следующей работе с модулем jobs.
- Миграции: `0006_jobs.sql`
- Отклонения от ТЗ: D80
- Следующее: волна 4 — 4A, 8A, 5A, 10A (вторая часть)

## [2026-10-03] — 6A-score — DONE

- Сделано: чистый скоринг matching v1 в `src/modules/matching/score/`: `types.ts` (CandidateForScoring/JobForScoring/FeedbackForScoring по 4.1, D90), `hard-filter.ts` (все 6 пунктов 10.2, причины-машина, пересечение часов через `workHoursOverlap` из `src/lib/tz.ts`, D91), `components.ts` (шесть компонентов 10.3 с нейтральными случаями; зарплата — через `compareSalaries`/`salaryScore` из `src/lib/money.ts` с курсами-параметром; сходство названий — параметром; D92), `feedback.ts` (×0.9ⁿ с полом 0.6, +0.03 с потолком ×1.15, флаг предложения обновить поле, D93), `assemble.ts` (перераспределение весов, lowData < 0.4, штрафы ×0.8/×0.95, clamp, порог 0.55, ALGO_VERSION = 1), `explain.ts` (детерминированный explain 10.7/D30 с i18n-ключами `explain.*`, `topExplain(…, 4)`, `toPublicMatch` → только score в 2 знака + explain), `semantic.ts` (SemanticProvider + NoopSemanticProvider → null, D11). Публичная поверхность — `src/modules/matching/service/index.ts`. i18n: ключ `explain` в `en.json` и `ru.json` (только свой ключ, файл не переформатирован). Деньги — только bigint/строки (D19), float только в скорах 0..1.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 225 passed (23 файла; из них 44 новых: hard-filter 10, components 20, assemble 21 + builders), включая кейсы DoD 6A: нейтральная зарплата (не исключает вакансию), gross/net, DST-расхождение Berlin↔NY (март: 4 ч; октябрь: среднее 3.5 ч за 14 дней из-за перехода США 1 ноября), окно через полночь; `pnpm format:check` на файлах подфазы → 0 (по репозиторию локально падает из-за core.autocrlf=CRLF — как в 4A-lib, в CI зелёный); `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-glm' pnpm build` → 0.
- P-тесты подфазы: нет (чистые функции без API/UI; P-кейсы появятся в полной 6A).
- Миграции: нет.
- Изменённые файлы: `src/modules/matching/score/{types,hard-filter,components,feedback,assemble,explain,semantic,index}.ts`, `src/modules/matching/service/index.ts`, `src/modules/matching/__tests__/{builders,hard-filter.test,components.test,assemble.test}.ts`, `src/messages/en.json`, `src/messages/ru.json`, `docs/DECISIONS.md` (D90–D94), `MISSION_LOG.md`. `src/lib/money.ts`/`src/lib/tz.ts` не менялись.
- Отклонения от ТЗ: D90–D94 (граничные правила: candidate experience null = 0; отсутствующий must-have = навыка нет вообще; «без зарплаты» = нет полных данных зарплаты у вакансии; hidden_company — hard, не множитель; verdict matched только при score = 1). Локальный prettier/CRLF — как в 4A-lib.
- OPEN QUESTION: нет.
- Следующая подфаза: полная 6A (`glm/4a` → 6A после 4B/2B; зависит от 4B и 2B).

## [2026-10-03] — 5A-rules — DONE (ветка `cursor/5a-rules`, ждёт слияния в master)

- Сделано: чистые правила отклика без таблиц, SQL, API и UI. `checkTransition` по таблице 4.2 (`via`: `patch`, `express_interest`, `auto_view`, `withdraw`): нет ребра или не тот актор → 409 `INVALID_TRANSITION`; `shortlisted` не через `express_interest` → 422 `EXPRESS_INTEREST_REQUIRED`. `checkApplyEligibility` зовёт `profileCompleteness` сервиса кандидатов: порог 60 и обязательные timezone, ≥3 навыка, контактный email → иначе 422 `PROFILE_INCOMPLETE` с `details.completeness` и `details.missing[]`. `checkApplyTarget`: imported → 422 `EXTERNAL_APPLY` с `externalUrl`; не `published` → 422 `JOB_NOT_PUBLISHED`. `checkReapply`: активный (не `withdrawn`) → 409 `ALREADY_APPLIED`; один повтор после одной отмены; вторая отмена и повтор сверх лимита → 409 `REAPPLY_LIMIT`.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (после rebase на 3B: 29 files, 218 tests); `pnpm exec prettier --check src/modules/applications` → 0; `pnpm build` → 0 (`SWC_NATIVE_BINDING_CACHE=C:\Users\Admin\.swc-cache-cursor`). `pnpm format:check` целиком локально может падать из-за CRLF. Миграций нет. До rebase: `gh run watch 37121527634` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37121527634. После rebase на D80: `gh run watch 37121993735` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37121993735 — `check` и `database` success (первый заход `database` упал на `error running container`, повтор зелёный). Следующий rebase — на 3B (D60–D64); его CI будет на голове ветки.
- P-тесты подфазы: нет (P9 — в 5A, когда появятся маршруты). Unit покрывает таблицу 4.2, D15, D8 и D27.
- Миграции: нет
- Изменённые файлы: `src/modules/applications/**`, `docs/DECISIONS.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: D75 (код `EXPRESS_INTEREST_REQUIRED` и 409 вместо 403 для чужого актора), D76 (трактовка «второй отмены» и `reapply_count`), D77 (59 недостижимо формулой 11.3; `missing[]` — ключи `profile.missing.*`), D78 (imported проверяется раньше статуса), D79 (срез без записи)
- OPEN QUESTION: нет
- Следующая подфаза: полная 5A (3B уже в `master`). Для этого агента — стоп до явной команды.

## [2026-10-03] — интеграция 6A-score (GLM) и 5A-rules (Cursor) — DONE

- Приняты после ревью: чистый скоринг matching v1 (`src/modules/matching/score/`, D90–D94; `toPublicMatch` отдаёт только округлённый score и до 4 пунктов explain — 5.3) и чистые правила откликов (`src/modules/applications/service/`, D75–D79). 5A-rules перебазирована на master после 6A-score (конфликты только в DECISIONS/MISSION_LOG).
- Команды проверки: unit 278 passed; `gh run watch 37123697966` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37123697966 — e2e 25 passed, медиана LCP 1698 мс.
- Замечание на 6A: снимок вакансии прикрепляется к результату через модульный `WeakMap` в `score/explain.ts` — передавать явно.
- Следующее: GLM — 9A-lib; Cursor — 5A; Antigravity — 7-lib, затем 8A; Codex — 4A; Claude Code — 10A (вторая часть).

## [2026-10-03] — 9A-lib — DONE

- Сделано: чистые правила уведомлений в `src/modules/notifications/lib/`: `catalog.ts` — каталог из 11 событий раздела 15 как данные (получатели, политика, email-умолчания, zod-strictObject-схемы payload без контактов), `resolveDelivery` с переопределением из notification_preferences, auth-письма отдельным типом `AuthEmailType` вне каталога (D100, D102); `batch.ts` — `groupHourlyBatch` для application.created по UTC-часу, один получатель → одно письмо, дедупликация вакансий (D100); `digest.ts` — `nextDigestAt` (08:00 local через `localToUtc` из `src/lib/tz.ts`, ≥ 24 ч после lastSentAt, DST учтён) и `shouldSendDigest` с порогом score ≥ 0.65 (D101); `unsubscribe.ts` — `signUnsubscribe`/`verifyUnsubscribe`: HMAC-SHA256, base64url, сравнение за постоянное время, срок жизни (D103); `service/index.ts` — публичная поверхность. Ключи писем под `notifications` в en.json/ru.json (только этот ключ, +202 строки суммарно, файл не переформатирован).
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 313 passed (36 файлов; 33 новых теста: каталог/resolveDelivery 9, батч 4, дайджест 12, отписка 7), включая en/ru parity через существующий messages.test.ts; `pnpm format:check` на файлах подфазы → 0 (LF; локальный CRLF-артефакт — как раньше, в CI зелёный); `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-glm' pnpm build` → 0.
- P-тесты подфазы: нет (чистые функции; P-кейсы preferences — в полной 9A).
- Миграции: нет.
- Изменённые файлы: `src/modules/notifications/lib/{catalog,batch,digest,unsubscribe,index}.ts`, `src/modules/notifications/service/index.ts`, `src/modules/notifications/__tests__/{catalog,batch,digest,unsubscribe}.test.ts`, `src/messages/en.json`, `src/messages/ru.json`, `docs/DECISIONS.md` (D100–D104), `MISSION_LOG.md`.
- Отклонения от ТЗ: D100–D104 — зафиксированы выборы, которых ТЗ не задаёт (UTC-граница батча, 08:00 local для дайджеста, семантика «не чаще раза в сутки» на инстантах, порядок проверок токена, сырые enum-значения в params). Замечание ревью по `score/explain.ts` (WeakMap) принято к сведению — правок не требует, отработаю в полной 6A.
- OPEN QUESTION: нет.
- Следующая подфаза: полная 9A (после 7A/7B — зависит от 5C, 6B, 7A).

## [2026-10-03] — 5A — DONE (ветка `cursor/5a`)

- Сделано: таблицы `applications` и `application_status_history` (миграция `0009_applications.sql`, частичный уникальный индекс пары вакансия+кандидат где статус не `withdrawn`). `transitionApplication` — единственный `UPDATE` статуса; он вызывает `checkTransition` и не копирует таблицу 4.2. Первый отклик — `INSERT` со статусом `applied` и history с `from_status` null. `POST/GET /api/applications`, `GET /api/applications/:id`, `POST .../withdraw`, `PATCH .../status` (`to=shortlisted` → 422 `EXPRESS_INTEREST_REQUIRED`). Лимит — уже существующий `enforceRateLimit("apply", userId)`, файл `src/lib/rate-limit.ts` не менялся; вызов после проверок цели, полноты и повтора. Кандидат — `requireCandidate(hasCandidateProfile)`. Страница `/[locale]/applications` группирует свои отклики и даёт отозвать. P9 в e2e: повтор → 409 `ALREADY_APPLIED`, imported → 422 `EXTERNAL_APPLY` с `externalUrl`, отзыв со страницы. Unit-тест ищет `update(applications)` вне `transition-application.ts`.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (34 files, 289 tests); `pnpm build` → 0 (`SWC_NATIVE_BINDING_CACHE=C:\Users\Admin\.swc-cache-cursor`). Интеграция и e2e локально не запускались (нет локального Postgres). `gh run watch 37125920442` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37125920442 — `check` и `database` success; unit 289, integration 25, e2e 26 passed, медиана LCP 1690 мс. Rebase на `origin/master` (`0e08a7d`, D81) до этого прогона; в `DECISIONS.md` оставлены и D81, и D105–D109.
- P-тесты подфазы: P9 ✅ (e2e `tests/e2e/applications.spec.ts`).
- Миграции: `0009_applications.sql` (0007 и 0008 в дереве нет, D109).
- Изменённые файлы: `src/db/schema/applications.ts`, `src/db/migrations/0009_applications.sql`, `src/modules/applications/**`, `src/app/api/applications/**`, `src/app/[locale]/applications/page.tsx`, `src/components/applications/application-list.tsx`, `src/components/shell/header.tsx`, `src/messages/en.json`, `src/messages/ru.json`, `tests/e2e/applications.spec.ts`, `docs/DECISIONS.md`, `docs/ERD.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: D105 (23505 → `ALREADY_APPLIED`; лимит после проверок; `?as=employer` → 404 до 5B), D106 (GET `:id` только владелец, без auto-view; актор PATCH), D107 (`reapply_count` 0 или 1), D108 (набор полей DTO и группировка страницы), D109 (номер миграции 0009 при пропуске 0007/0008). D75–D79 не менялись.
- OPEN QUESTION: нет
- Следующая подфаза: не начинать. 5B и 5C — отдельные команды.
