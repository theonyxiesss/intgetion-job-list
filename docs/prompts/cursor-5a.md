Ты — Cursor. Подфаза: **5A** проекта INTGETION JOB LIST. Агент: `cursor`, ветка `cursor/5a`, папка `C:\Users\Admin\Documents\Integetion jobs 5A`, миграция `src/db/migrations/0009_*.sql`, решения D75–D79.

Сначала прочитай `docs/prompts/_common.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй его порядок работы.

Зависимости: 3B и 2B должны быть в `origin/master`. Пока их нет — ничего не делай и ответь «ЖДУ: <подфаза>».

## 5A по ТЗ

Раздел 22: Applications — apply (D15, D27), `transitionApplication`, history, withdraw, `/applications`. Вне скоупа: express interest и reveal (5C), пайплайн работодателя (5B). DoD: P9; таблица переходов; повтор → 409.

- Таблицы `applications`, `application_status_history` по 4.1. Partial unique `(job_id, candidate_id) WHERE status <> 'withdrawn'` (D27).
- Статус-машина — раздел 4.2, единственная функция `transitionApplication()` с таблицей разрешённых переходов (D2). Прямой UPDATE статуса вне неё запрещён — добавь тест/grep, который это ловит.
- `POST /api/applications`: только кандидат (`requireCandidate` + `hasCandidateProfile` из 2B); imported → 422 `EXTERNAL_APPLY` с `details.externalUrl` (D8); неполный профиль → 422 `PROFILE_INCOMPLETE` с `details.completeness` и `details.missing[]` (D15); активный дубль → 409 `ALREADY_APPLIED`; после `withdrawn` один повтор, вторая отмена → 409 `REAPPLY_LIMIT` (D27).
- Лимит apply 30/сутки на пользователя (раздел 6). Правила лимитов в `src/lib/rate-limit.ts` меняет только Claude Code — опиши нужное правило в отчёте.
- `GET /api/applications?as=candidate`, `GET /api/applications/:id` (кандидат-владелец; чужое → 404), `POST /api/applications/:id/withdraw`. `PATCH .../status` с `to='shortlisted'` → 422 (только через express interest в 5C).
- Страница `/[locale]/applications` (по статусам, withdraw). Строки — под ключом `applications`.

## Тесты

Unit: вся таблица переходов 4.2, D15, D27. Интеграция: гонка двух одновременных apply → один успех, один 409. e2e: кандидат откликается и отзывает отклик. **P9**: повторный apply → 409; apply на imported → 422 + `externalUrl`.
