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

## [2026-10-02] — 0B — NOT DONE

- Сделано: D32 (облачный проект `intgetion-dev`, проверка с нуля в GitHub Actions). В ТЗ обновлены разделы 3.1 и 19.1. Миграция `src/db/migrations/0001_enums_and_users.sql` (enum-типы, `users`, роль `app_rw`, RLS deny-all), зеркало Drizzle, `src/lib/http`, `GET /api/health`, `docs/ERD.md`, job `database` в CI (`supabase start` → миграции с нуля → повторное применение → проверка `app_rw` и RLS → интеграционные тесты → `/api/health`). Проверка DDL роли `app_rw` идёт отдельным входом под этой ролью: `GRANT app_rw` роли `postgres` на локальном Supabase обрывает сессию.
- Команды проверки: `pnpm format:check` → 0; `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 0 (3 files, 11 tests); `pnpm build` → 0, маршрут `/api/health` dynamic. `pnpm db:migrate` → 1: `DATABASE_MIGRATION_URL is not set` — файла `.env.local` на диске нет. `gh run watch 37066178224` → 0. Прогон https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37066178224 на `7119e85`: job `check` success, job `database` success. В логе: `applied: 0001_enums_and_users.sql`, повтор `already applied`, `app_rw exists and users RLS denies anon and authenticated`, интеграционный файл passed, `{"ok":true}`.
- P-тесты подфазы: нет
- Миграции: `src/db/migrations/0001_enums_and_users.sql` применена с нуля в CI. На облако `intgetion-dev` не применена.
- Изменённые файлы: `docs/DECISIONS.md`, `docs/TZ_INTGETION_v6.md`, `docs/ERD.md`, `src/db/**`, `src/lib/http/**`, `src/app/api/health/route.ts`, `scripts/apply-migrations.mjs`, `scripts/verify-db.mjs`, `scripts/ci-db.sh`, `.github/workflows/ci.yml`, `supabase/config.toml`
- Отклонения от ТЗ: локальный Docker заменён на D32 по команде пользователя. Ссылка на D32 в разделах 3.1 и 19.1.
- OPEN QUESTION: нет
- Следующая подфаза: 0B, пока миграция не применена к `intgetion-dev`
- Нужно от пользователя: положить ключи в `.env.local` (`DATABASE_URL` для `app_rw`, `DATABASE_MIGRATION_URL` для владельца схемы). Скрипт не создаёт пароль `app_rw` на хостинге.
