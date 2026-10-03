# Параллельная работа агентов

Действует вместо п.1 D33 («подфазы подряд»), пока над проектом работают несколько агентов. Каждый агент делает **только свою подфазу** и останавливается с отчётом.

## Кто что делает

Порядок задаёт колонка «Зависит от» раздела 22 ТЗ. Подфазу можно начинать, только когда все её зависимости **влиты в `master`** (запись DONE в `MISSION_LOG.md` на `master`).

| Волна | Подфаза                                              | Агент       | Зависит от | Ветка                 | Миграция                   | Номера решений |
| ----- | ---------------------------------------------------- | ----------- | ---------- | --------------------- | -------------------------- | -------------- |
| 1     | 1B                                                   | Claude Code | 1A         | `claude/1b`           | `0002_*`                   | D38–D41        |
| 1     | 2A                                                   | Cursor      | 0B         | `cursor/2a`           | `0003_*`                   | D42–D45        |
| 1     | ревью 1B и 2A                                        | Antigravity | —          | без изменений кода    | —                          | —              |
| 2     | 3A                                                   | Codex       | 1B         | `codex/3a`            | `0004_*`                   | D50–D54        |
| 2     | 2B                                                   | Cursor      | 2A, 1B     | `cursor/2b`           | `0005_*`                   | D55–D59        |
| 3     | 3B                                                   | Codex       | 3A, 2A     | `codex/3b`            | `0006_*`                   | D60–D64        |
| 2     | 4A-lib: `src/lib/money.ts`, `src/lib/tz.ts`          | GLM         | —          | `glm/lib`             | нет                        | D65–D69        |
| 2     | 7-lib: `src/lib/llm/**`, `evals/**`                  | Claude Code | —          | `claude/llm-lib`      | нет                        | D85–D89        |
| 3     | 6A-score: `src/modules/matching/score/**`            | GLM         | —          | `glm/matching-score`  | нет                        | D90–D94        |
| 3     | 5A-rules: `src/modules/applications/**` (без таблиц) | Cursor      | 2B         | `cursor/5a-rules`     | нет                        | D75–D79        |
| 4     | 9A-lib: `src/modules/notifications/**` (без таблиц)  | GLM         | —          | `glm/notify-lib`      | нет                        | D100–D104      |
| 5     | 4B (передана от GLM)                                 | Cursor      | 4A         | `cursor/4b`           | `0011_*`                   | D110–D114      |
| 5     | 5B                                                   | Cursor      | 5A         | `cursor/5b`           | `0012_*` при необходимости | D115–D119      |
| 6     | 5C                                                   | Cursor      | 5B         | `cursor/5c`           | `0012_*`                   | D120–D124      |
| 7     | 9A                                                   | Cursor      | 5C         | `cursor/9a`           | `0013_*`                   | D125–D129      |
| 4     | 4A                                                   | Codex       | 3B         | `codex/4a`            | `0007_*`                   | D95–D99        |
| 4     | 8A                                                   | Codex       | 3B, 2A     | `codex/8a`            | `0008_*`                   | D70–D74        |
| 4     | 5A                                                   | Cursor      | 3B, 2B     | `cursor/5a`           | `0009_*`                   | D75–D79        |
| 4     | 10A                                                  | Claude Code | 3B         | `claude/10a`          | `0010_*`                   | D80–D84        |
| 7     | 10B                                                  | Claude Code | 10A        | `claude/10b`          | `0014_*`                   | D130–D134      |

Claude Code между волнами сливает ветки, применяет миграции к облачной БД и чинит конфликты. Для своей инфраструктурной работы вне подфаз Claude Code использует номера D46–D49.

## Правила

1. **Своя папка и своя ветка.** Каждый агент работает в отдельном git worktree:
   ```bash
   git fetch origin
   git worktree add "../Integetion jobs <ПОДФАЗА>" -b <агент>/<подфаза> origin/master
   cp ".env.local" "../Integetion jobs <ПОДФАЗА>/.env.local"
   cd "../Integetion jobs <ПОДФАЗА>" && pnpm install --frozen-lockfile
   ```
   В основной папке `Integetion jobs` и в чужих worktree ничего не менять.
2. **Проверка старта.** Перед работой убедись, что все зависимости подфазы влиты в `origin/master` (`git log origin/master`, `MISSION_LOG.md`). Если нет — ничего не делай и отчитайся «ЖДУ: <какая подфаза>».
3. **Миграция — только с номером из таблицы.** Не создавай таблицы чужих подфаз. Если нужна таблица, которой ещё нет и которая принадлежит другой подфазе, — пометь BLOCKED и опиши.
4. **Решения — только свои номера D из таблицы.** Дописывай в конец `docs/DECISIONS.md`.
5. **Чужие файлы не трогать.** Только Claude Code меняет: `src/proxy.ts`, `src/lib/http/**`, `src/lib/supabase/**`, `src/lib/auth-guards.ts`, `src/lib/rate-limit.ts`, `src/lib/audit.ts`, `src/lib/security-headers.ts`, `src/modules/auth/**`, `next.config.ts`, `.github/workflows/ci.yml`, `scripts/ci-*.sh`, `scripts/*-db.mjs`, `supabase/config.toml`. Нужно изменение там — опиши его в отчёте, не делай сам.
6. **Общие файлы — минимально:** `src/db/schema/index.ts` (одна строка `export`), `src/messages/{en,ru}.json` (только свой ключ верхнего уровня, например `profile`, `company`, `jobs`; не переформатировать файл), `docs/ERD.md` (только свои таблицы), `MISSION_LOG.md` (только своя запись в конец). Новые npm-зависимости — только если без них нельзя, с объяснением в отчёте.
   6a. **e2e-тесты** импортируют `test` и `expect` из `tests/e2e/fixtures.ts`, а не из `@playwright/test`: так у каждого теста свой IP и лимиты по IP не заканчиваются в CI (D46). Второй пользователь в тесте — `newContextWithIp(browser)` оттуда же. Лимиты раздела 6 для своей подфазы бери из `rateRules` в `src/lib/rate-limit.ts` (`jobCreateUnverified`, `jobCreateVerified`, `apply`, `report`, `botGuest`, `botUser` уже есть).
7. **Чужие модули — только через `src/modules/<m>/service/index.ts`.** Guards — из `src/lib/auth-guards.ts`; `requireCandidate` и `requireMembership` принимают функцию поиска из сервиса твоего модуля (D38.2).
8. **Облачная БД.** `pnpm db:migrate` на облако не запускать — это делает Claude Code после слияния. Проверка миграций с нуля — в CI (`supabase start`). Интеграционные тесты против облака — только читающие или убирающие за собой.
9. **Коммиты** в свою ветку: `<подфаза>: <кратко>`, push в `origin <ветка>`, CI смотреть через `gh run watch`. Красный CI — чинить до отчёта. В `master` не пушить и не мерджить.
10. **Перед отчётом:** `git fetch && git rebase origin/master`; конфликты в `MISSION_LOG.md`, `DECISIONS.md`, `ERD.md`, `messages/*.json`, `schema/index.ts` — сохранить обе стороны; `git push --force-with-lease` только в свою ветку; дождаться зелёного CI.
11. **Протокол ТЗ (разделы 0, 23, 24) действует полностью:** план перед кодом, тесты не отключать и не ослаблять, заглушки за реализацию не выдавать, отчёт с выводом команд и ссылкой на CI; если что-то не прошло — первой строкой `ПОДФАЗА НЕ ЗАВЕРШЕНА`.

## Окружение (Windows)

- Локальный `pnpm build` падает: SWC отвергает кэш, если у папки-предка есть права записи для посторонних SID. Так сейчас и с `AppData\Local`, и с папками проектов (их права расширяют песочницы агентов). Кэш держи вне проекта, в своей папке под `C:\Users\Admin`. В bash: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-<агент>' pnpm build` (папку создай заранее). Права папок не меняй.
- Локально нет Docker и не скачивается Chromium: миграции с нуля и e2e проверяются только в CI (job `database`).
- Приложение локально открывать по `http://localhost:3000` (CSRF сверяет `Origin` с `NEXT_PUBLIC_SITE_URL`).
- Файлы с обратными слешами (`\\`) не записывать через bash heredoc: оболочка схлопывает `\\` в `\`. Используй редактор или инструмент записи файла.
- Секреты из `.env.local` не выводить в чат и не коммитить.
