Ты — Antigravity. Твоя подфаза: **8A** проекта INTGETION JOB LIST. Агент: `antigravity`, ветка `antigravity/8a`, папка `C:\Users\Admin\Documents\Integetion jobs 8A`, миграция `src/db/migrations/0008_*.sql`, решения D70–D74.

Сначала прочитай `docs/prompts/_common.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй его порядок работы.

Зависимости: 3B и 2A должны быть в `origin/master`. Пока их нет — ничего не делай и ответь «ЖДУ: 3B».

## 8A по ТЗ

Раздел 22: импорт на фикстурах — адаптеры, нормализация, дедуп, external apply (D8), автомодерация, `import_runs`, expire. Вне скоупа: живой источник (8B, только с founder approval, D18). DoD: P6; кейс дедупа; scam отклонён. Подробности — раздел 13 целиком и D8, D9, D18.

- Таблицы `import_sources`, `import_runs`, `job_sources` по 4.1. `import_sources.enabled` и `republish_allowed` по умолчанию false; `IMPORT_LIVE_ENABLED=false` — сетевых запросов к внешним источникам нет вообще.
- Фикстуры — `fixtures/import/<source>/`; данные синтетические, без копирования реальных объявлений. Скрейпинг HTML запрещён (D18).
- Модуль `src/modules/ingestion`: адаптер на источник → нормализация (13.2, навыки через `normalizeSkill()` 2A, нераспознанные не попадают в вакансию) → дедуп (13.3) → автомодерация и жизненный цикл (13.4, scam-паттерны — `src/config/scam-patterns.ts`, список наполняешь ты) → запись через сервис вакансий 3B. Модуль без состояния в памяти (раздел 3.2).
- Импортированные компании — `origin='imported'`: их нельзя claim, в них нельзя вступить, бейджа «проверено» нет (D9).
- External apply (D8): `POST /api/jobs/:id/apply-external` → `{ externalUrl }` + `user_job_feedback(action='applied_external')`. Если таблицы `user_job_feedback` ещё нет (это 4B) — интерфейс, тест с двойником, BLOCKED на эту часть.
- Cron `/api/cron/import` (по источнику, ≥ 1 час; `Bearer CRON_SECRET`, без секрета → 404) работает только с фикстурами.

## Тесты

Unit: нормализация, дедуп (одинаковая вакансия из двух фикстур → одна запись + merge), scam → rejected. Интеграция: полный прогон фикстуры → `import_runs` с правильными счётчиками; повторный прогон идемпотентен. **P6**: импортированную вакансию нельзя редактировать (PATCH → 404); вступить или claim в imported-компанию нельзя.
