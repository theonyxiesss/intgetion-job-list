Проект: INTGETION JOB LIST, репозиторий https://github.com/theonyxiesss/intgetion-job-list, основная папка `C:\Users\Admin\Documents\Integetion jobs` (её не трогай — там работают другие агенты).

Сначала прочитай:

1. `docs/PARALLEL_WORK.md` из `origin/master` (если его там ещё нет — из `origin/claude/1b`): кто что делает, номера миграций и решений, запрещённые файлы, как создать свой worktree.
2. `AGENTS.md` (Next.js 16 отличается от того, что ты знаешь — читай `node_modules/next/dist/docs/` перед кодом).
3. `docs/TZ_INTGETION_v6.md`: разделы 0, 2, 4, 5, 6, 7, 8, 19, 22, 23, 24 и раздел своей подфазы.
4. `docs/DECISIONS.md` целиком и `MISSION_LOG.md`.

Порядок работы:

- Проверь, что зависимости подфазы влиты в `origin/master`. Если нет — остановись и напиши «ЖДУ: <подфаза>».
- Создай свой worktree и ветку по `docs/PARALLEL_WORK.md`, работай только там.
- Выведи план на 5–15 строк (файлы, миграция, тесты), затем делай.
- Делай только свою подфазу. После неё — отчёт по шаблону раздела 0 ТЗ и остановка.
- DoD (раздел 23): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build` = 0; P-тесты подфазы зелёные; строки UI в `en.json` и `ru.json`; запись в `MISSION_LOG.md`; отклонения — в `DECISIONS.md` своими номерами; CI на твоей ветке зелёный; ветка перебазирована на свежий `origin/master`.
- В `master` не пушь и не мерджи. Слияние делает пользователь или Claude Code.
