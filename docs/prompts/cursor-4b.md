Ты — Cursor. Тебе передаётся подфаза **4B** проекта INTGETION JOB LIST: сохранённые вакансии, скрытие, жалобы, `user_job_feedback`. GLM начал её и выбыл, а работа не доведена до зелёного CI. Агент: `cursor`, ветка `cursor/4b`, папка `C:\Users\Admin\Documents\Integetion jobs 4B`, миграция `src/db/migrations/0011_*.sql`, решения D110–D114 (номера остаются за 4B).

**Порядок работы:** сначала 4B, потом 9A (`docs/prompts/cursor-9a.md`). 4B блокирует жалобы в админке (10A), запись внешних откликов (8A) и матчинг (6A). Если 9A уже начата, закоммить её как WIP в `cursor/9a`, запушь и переключись на 4B.

Возьми работу GLM за основу, а не пиши с нуля:

```bash
git fetch origin
git worktree add "../Integetion jobs 4B" -b cursor/4b origin/glm/4b
cd "../Integetion jobs 4B"
git rebase origin/master
```

В `master` с тех пор влиты 8A, 5C и вторая часть 10A. При конфликтах в `docs/DECISIONS.md` и `MISSION_LOG.md` сохраняй обе стороны. Если конфликтует `pnpm-lock.yaml`, бери версию из `master` и запусти `pnpm install`. После правок в `src/messages/*.json` проверь, что JSON валиден и ключи en/ru совпадают. Номер миграции `0011` не меняй: в `master` уже есть 0008, 0009 и 0012, порядок применения от этого не ломается.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй их порядок работы.

Прочитай в `docs/TZ_INTGETION_v6.md`: 22 (строка 4B), 4.1 (`saved_jobs`, `user_job_feedback`, `reports`), 7 (save/hide/report), 8 (`/saved-jobs`), 10.5 (feedback loop, что из 4B читает 6A), 14.5 (жалобы: одна на объект), 6 (лимиты), 19.2 (P15); решения D110–D114 в ветке GLM, D8, D72 (8A ждёт writer feedback) и D84 (жалобы и авто-пауза в 10A).

## Что должно быть в 4B (DoD раздела 22: скрытая вакансия исчезает из выдачи; лимиты жалоб)

- **Сохранение и скрытие.** Save/unsave вакансии и страница `/[locale]/saved-jobs`. Hide вакансии и hide компании пишут `user_job_feedback`. Скрытая вакансия и вакансии скрытой компании исчезают из `/jobs` и `GET /api/jobs` только для этого пользователя; у других они остаются. Фильтр делай в публичном поиске 4A (`src/modules/jobs/repo/public-search-repo.ts`) условием по текущему пользователю: гость видит всё.
- **Жалобы.** Одна жалоба на объект от пользователя: повтор → 409. Лимит берётся из `rateRules.report` в `src/lib/rate-limit.ts`. Сверх лимита → 429 с заголовком `Retry-After` (P15). Сам `rate-limit.ts` не меняй: если там чего-то не хватает, опиши это в отчёте. Решение по жалобам и авто-пауза — не твоя часть: это 10A (D84, Claude Code). Тебе нужны только таблица, создание жалобы и сервисная функция, которую сможет вызвать админка.
- **Writer для 8A (D72).** Экспортируй из сервиса 4B функцию записи `user_job_feedback(action='applied_external')` с сигнатурой `ExternalApplyRecorder` из `src/modules/ingestion/service/apply-external.ts`: `({ userId, jobId }) => Promise<void>`, повтор идемпотентен. Подключи её в `src/app/api/jobs/[id]/apply-external/route.ts` третьим аргументом `applyExternal`. Кнопку Apply на карточке импортированной вакансии переведи на этот endpoint: POST, затем переход на `externalUrl`. Без JS ссылка должна по-прежнему вести на внешний URL.

## Что уже известно о красном CI ветки GLM

Последние прогоны `glm/4b` падали на e2e:

1. `hiding a job removes it from listing but not from others` — после hide вакансия остаётся в списке. Проверь, что фильтр действительно стоит в запросе выдачи для текущего пользователя и что страница `/jobs` не отдаётся из кеша (`dynamic`).
2. `P15: the 11th report is limited with Retry-After` — лимит не срабатывает. Проверь, что ключ лимита — пользователь (или IP для гостя, по `rateRules`), что счётчик пишется до ответа и что каждая из 11 жалоб идёт на разный объект, иначе срабатывает 409, а не 429.
3. В логе WebServer есть `Error: An error occurred in the Server Components render`. Найди страницу, которая падает (скорее всего `/saved-jobs` или `/jobs` при залогиненном пользователе), и почини её.

Разбирайся сам по логам CI (`gh run view <id> --log-failed`) и локальным тестам. Не отключай и не ослабляй тесты, чтобы они прошли.

## Правила

- Не трогай файлы Claude Code (список в PARALLEL_WORK, правило 5).
- e2e импортируют `test`/`expect` из `tests/e2e/fixtures.ts`; второй пользователь — `newContextWithIp(browser)`. Для P15 у каждого теста свой IP, это уже делает fixture.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-cursor' pnpm build`.
- В `MISSION_LOG.md` добавь запись за 4B: что сделал GLM, что доделал ты.
- Ветку `glm/4b` не трогай и не пушь в неё. Вся работа идёт в `cursor/4b`.

## Тесты

- **Unit:** правила hide и save; повторная жалоба → 409; writer `applied_external` идемпотентен.
- **Интеграция:** hide вакансии и hide компании убирают их из `searchJobs` только для этого пользователя; одна жалоба на объект на уровне БД (уникальный индекс).
- **e2e:**
  - hide убирает вакансию из `/jobs` у этого пользователя и не у другого;
  - сохранённая вакансия видна на `/saved-jobs`;
  - P15 — 11-я жалоба → 429 с `Retry-After`;
  - apply-external у залогиненного пользователя пишет feedback, а гость получает `externalUrl` без записи.

Отчёт по шаблону раздела 0 ТЗ: с выводом команд, ссылкой на зелёный CI ветки `cursor/4b` и выводом `git log --oneline origin/master..origin/cursor/4b`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный. После отчёта переходи к 9A.
