Ты — Cursor. Задача: чистые правила откликов для проекта INTGETION JOB LIST — статус-машина 4.2, допуск к отклику (D15), повторный отклик (D27). Это выделенная заранее часть твоей подфазы 5A: только чистые функции и данные, без таблиц, SQL, API и UI (их ты сделаешь в 5A, когда 3B окажется в `master`).
Агент: `cursor`, ветка `cursor/5a-rules`, папка `C:\Users\Admin\Documents\Integetion jobs 5A-rules`, решения D75–D79 (это твой диапазон 5A; используй с начала, в 5A продолжишь со следующего свободного). Миграций нет.

2B принята и влита в `master`, миграция 0005 применена к облаку, `/api/me` теперь отдаёт `hasCandidateProfile` — спасибо. Старую папку `Integetion jobs 2B` больше не используй: создай новый worktree от свежего `origin/master` по `docs/PARALLEL_WORK.md`.

Сначала прочитай `docs/prompts/_common.md`, `docs/PARALLEL_WORK.md` и `docs/prompts/cursor-5a.md` из `origin/master`. Прочитай в `docs/TZ_INTGETION_v6.md`: 4.1 (`applications`, `application_status_history`, `application_reveals`), 4.2, 5.1–5.2, 6 (каталог ошибок), 7 «Applications», 11.3; решения D2, D3, D8, D15, D23, D27 и свои D55–D59 в `docs/DECISIONS.md`.

## Что сделать (`src/modules/applications/`)

1. **Статус-машина 4.2 как данные**: одна таблица разрешённых переходов (`from → to → кто: employer | candidate`), терминальные статусы `hired`, `rejected`, `withdrawn`. Функция `checkTransition({ from, to, actor, via })`, где `via`: `patch` (общий PATCH статуса), `express_interest`, `auto_view` (автоматический `viewed` при открытии), `withdraw`. Результат — `ok` или ошибка:
   - перехода нет в таблице → 409 `INVALID_TRANSITION`;
   - `to = shortlisted` не через `express_interest` → 422 (раздел 7: «`to='shortlisted'` → 422, только express-interest»; код — из каталога раздела 6 или новый с записью в D75);
   - актор не тот (кандидат пытается `rejected`, работодатель — `withdrawn`) → то же `INVALID_TRANSITION`, а не 403: объект ему виден, но такого перехода для него нет — обоснуй в D75.
     Это будет единственное место правил переходов (D2): в 5A `transitionApplication()` вызывает только её.
2. **Допуск к отклику (D15, 11.3)** — `checkApplyEligibility(profileSnapshot)`: полнота ≥ 60 и три обязательных поля (timezone, ≥ 3 навыка, контактный email). Полноту не пересчитывай сам — используй функцию полноты из сервиса кандидатов (2B, `src/modules/candidates/service/index.ts`). Ошибка — 422 `PROFILE_INCOMPLETE` с `details.completeness` и `details.missing[]` ключами i18n.
3. **Импортированная вакансия (D8)** — `checkApplyTarget({ origin, externalUrl, status })`: imported → 422 `EXTERNAL_APPLY` с `details.externalUrl`; не `published` → 422 `JOB_NOT_PUBLISHED`.
4. **Повторный отклик (D27)** — `checkReapply(existingForJobAndCandidate)` по истории откликов этой пары: есть активный (не `withdrawn`) → 409 `ALREADY_APPLIED`; после `withdrawn` разрешён один повтор (`reapply_count`); правило «вторая отмена → 409 `REAPPLY_LIMIT`» из D27 реализуй буквально и опиши трактовку в D76.
5. Ошибки — через `HttpError` из `src/lib/http` (сам файл не меняй). Публичное — через `src/modules/applications/service/index.ts`.

## Правила

- Меняешь только: `src/modules/applications/**`, `docs/DECISIONS.md` (D75–D79, в конец), `MISSION_LOG.md` (своя запись в конец). `src/messages/*` — только если нужны новые ключи для `missing[]`, и только под ключом `applications`.
- Не создавай таблиц, миграций, маршрутов и страниц — это 5A.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-cursor' pnpm build`.

## Тесты (unit, vitest)

- Вся таблица 4.2: каждый разрешённый переход проходит, каждый запрещённый (включая из терминальных) — 409; кандидат и работодатель отдельно.
- `shortlisted` через `patch` → 422; через `express_interest` из `applied` и `viewed` → ok; `viewed` только через `auto_view` и только из `applied`.
- D15: 59 и 60 процентов; 100 процентов без одного из трёх обязательных полей → 422 с правильным `missing[]`.
- D8: imported → 422 с `externalUrl`; draft/closed → 422 `JOB_NOT_PUBLISHED`.
- D27: первый отклик, активный дубль → 409, повтор после `withdrawn` → ok, повтор сверх лимита и «вторая отмена» → 409 `REAPPLY_LIMIT`.

Отчёт по шаблону раздела 0 ТЗ (код подфазы — `5A-rules`), с выводом команд, ссылкой на зелёный CI ветки `cursor/5a-rules`, решениями D75+ и выводом `git log --oneline origin/master..origin/cursor/5a-rules`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
