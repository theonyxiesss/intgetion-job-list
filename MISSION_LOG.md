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
