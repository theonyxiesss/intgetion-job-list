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
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (21 files, 129 tests); `pnpm exec prettier --check` по своим изменённым файлам → 0; `pnpm build` → 0 (`SWC_NATIVE_BINDING_CACHE=C:\Users\Admin\.swc-cache-cursor`). `pnpm format:check` целиком локально не зелёный из-за CRLF рабочей копии. `pnpm db:migrate` и интеграция локально не запускались: 0005 на облако не применялась. До rebase `gh run watch 37118467512` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37118467512 — `check` и `database` success. Прогоны до этого: 37114272095 (CHECK с подзапросом), 37114589505 (e2e не нашёл поле Timezone), 37118007473 (prettier, job `database` уже зелёный). После rebase на `e491bb2` (D46) прогон головы ветки — в отчёте сессии.
- P-тесты подфазы: P1 ✅ (интеграция: чужой `getCandidateForViewer` → 404, в ошибке нет email; e2e: кандидат B получает 404, в теле нет контактов и ключа `contacts`)
- Миграции: `src/db/migrations/0005_candidate_profiles.sql` (в CI с нуля и повторно; на `intgetion-dev` не применялась). CHECK желаемых должностей — `public.candidate_titles_valid`.
- Изменённые файлы: `src/db/migrations/0005_candidate_profiles.sql`, `src/db/schema/{candidates,index}.ts`, `src/modules/candidates/**`, `src/modules/contacts/**`, `src/app/api/candidates/**`, `src/app/[locale]/profile/**`, `src/components/profile/profile-form.tsx`, `src/components/shell/header.tsx`, `src/messages/{en,ru}.json`, `tests/e2e/profile.spec.ts`, `docs/{DECISIONS,ERD}.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: D55 (что считать подтверждёнными часами и форматом), D56 (до 5A профиль виден только владельцу; страницы открыты любому подтверждённому пользователю), D57 (длины и `candidate_titles_valid`), D58 (навыки через `normalizeSkill`, максимум 30), D59 (две транзакции без цикла импортов; `GET /api/me` не переключался)
- OPEN QUESTION: нет
- Следующая подфаза: 5A после 3B. Для этого агента — стоп до явной команды.
