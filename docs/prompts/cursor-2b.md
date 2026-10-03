Ты — Cursor. Твоя следующая подфаза: **2B** проекта INTGETION JOB LIST. Агент: `cursor`, ветка `cursor/2b`, папка `C:\Users\Admin\Documents\Integetion jobs 2B`, миграция `src/db/migrations/0005_*.sql`, решения D55–D59.

Сначала прочитай `docs/prompts/_common.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй его порядок работы.

Зависимости: 2A и 1B должны быть в `origin/master`. Старый worktree `Integetion jobs 2A` больше не используй — создай новый от свежего `origin/master`.

## 2B по ТЗ

Раздел 22: профиль кандидата — таблицы 4.1, `candidate_contacts` + `contactsService`, формы `/profile/edit`, полнота (11.3), timezone из браузера, i18n. Вне скоупа: бот. DoD: unit полноты; P1.

- Таблицы раздела 4.1 блока CANDIDATE (`candidate_profiles`, `candidate_skills`, `candidate_experience`, `candidate_languages`, `candidate_contacts` и др. из этого блока), RLS через `public.enable_rls_deny_all()`.
- Модуль `src/modules/candidates` и модуль `src/modules/contacts`. `contacts/repo` импортирует только `contacts/service` (ESLint это уже проверяет). Наружу контакты — только через `contactsService` (D16).
- Экспортируй из сервиса кандидатов `hasCandidateProfile(userId)` — это функция для `requireCandidate` (D38.2).
- API раздела 7 «Candidates»: `GET/PATCH /api/candidates/me` (пересчёт `completeness` в той же транзакции), `GET/PUT /api/candidates/me/contacts`, `GET /api/candidates/:id` по D24 (до откликов, то есть до 5A, чужой профиль виден только владельцу; остальным 404; ключа `contacts` нет никогда, D16).
- Навыки — только через `normalizeSkill()` из сервиса таксономии (2A); нераспознанные — в `skill_suggestions`. Не больше 30 навыков на кандидата.
- Полнота — формула 11.3 (сумма 100), unit-тесты на каждую строку формулы.
- Timezone: IANA, предзаполнение из `Intl.DateTimeFormat().resolvedOptions().timeZone` с подтверждением, валидация через `Intl`; хранить смещения запрещено (D6).
- Страницы `/[locale]/profile` и `/[locale]/profile/edit` (прогресс-бар полноты + «что добавить», контакты). Строки — под ключом `profile` в `en.json`/`ru.json`.
- `GET /api/me` сейчас отдаёт `hasCandidateProfile: false` (D37.6). Этот файл в `src/modules/auth/**` — его меняет только Claude Code. Опиши в отчёте, какую функцию сервиса кандидатов нужно вызвать, и не меняй его сам.

## Тесты

Unit: полнота, валидация timezone, DTO без `contacts`. Интеграция: профиль + контакты на БД. e2e: регистрация → заполнение профиля → полнота растёт. **P1**: кандидат B запрашивает профиль кандидата A → 404, в теле нет контактов. Для e2e — хелперы `tests/e2e/auth.spec.ts`, `tests/e2e/mail.ts` и заголовок `origin: http://127.0.0.1:3000` на API-запросах.
