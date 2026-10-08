# Утренние сводки — как устроено

ТЗ: [../tz/20-morning-briefs.md](../tz/20-morning-briefs.md). Решение: D340.

## Поток

1. `/api/cron/morning-briefs` (Vercel, каждые 15 мин, `CRON_SECRET`) → `runMorningBriefsCron`.
2. Пауза в `brief_settings` → выход. Иначе по каждому слоту из `brief_slots`
   `dueSlotDate` смотрит, наступило ли местное время слота (окно догона 2 ч).
3. `runSlot` занимает день строкой в `brief_runs` (unique по слоту и дате для
   боевых запусков). Повторный cron получает конфликт и ничего не шлёт.
4. Кандидаты: `users.status = 'active'`, `candidate_profiles.agent_briefs_enabled`,
   слот по `timezone` (`slotForTimeZone`, без пояса → `europe`).
5. Вакансии: `loadFeedJobs` (лента `/matches`) → `pickDigestJobs` (≥ 0.65, новые
   с `last_digest_at`, ≤ 5). Пусто → ничего.
6. Триггер в одной транзакции: строка `brief_deliveries` (защита от повтора) →
   `deliverInTransaction` (`matches.digest`: in-app + письмо по настройкам) →
   `last_digest_at`. Потом заметка в чат `postSystemEvent`.
7. Доставка дальше не наша: Telegram — `/api/cron/telegram` (D237), почта — 9A.
8. `/notifications` (D349): галочка почты пишет канал `email` для тех же типов, что и Telegram. Заглушка или неподтверждённая почта — галочка выключена, ссылка на `/settings/account`. Переключатель «Агент подбирает мне вакансии» пишет `agent_briefs_enabled` только своему профилю; выключен — обе галочки серые.
9. Текст Telegram для `matches.digest`: до пяти строк «Название — Компания» и ссылка на `/jobs/{id}` (`sampleJobs` в payload), внизу `/matches` и `/notifications`.

## Код

- `src/modules/notifications/lib/briefs.ts` — слоты, время, окно
- `src/modules/notifications/service/morning-briefs.ts` — cron и `runSlot` (с `dryRun` для админки)
- `src/db/migrations/0032_morning_briefs.sql`, `src/db/schema/briefs.ts`

## Работодатель (D352)

1. Получатели — `readEmployerRecipients`: `company_members` с ролью owner/admin/recruiter, `companies.agent_briefs_enabled`, компания не suspended/rejected, пользователь active, нет сводки `employer` за этот день. Пояса у работодателя нет → только в слоте `europe`.
2. Кандидаты — `loadCompanyCandidates`: для каждой опубликованной вакансии `computeMatchesForJob`, затем `readCompanyMatches` из `matching_results` (≥ 0.65, не `is_hidden`, не откликался в компанию). Результат кэшируется на компанию внутри запуска.
3. Правила — `lib/employer-briefs.ts` (`pickEmployerCandidates`): новые с прошлой сводки (`max(brief_deliveries.created_at)`), один раз на кандидата, ≤ 5, лучшие первыми. Карточка — `toBriefCard`, без id и контактов.
4. Триггер — `briefEmployer`: транзакция `brief_deliveries` (employer) → `deliverInTransaction` (`company.candidates_digest`), потом `postSystemEvent` шаблоном `notifications.employerBrief.chatEvent`.
5. Telegram: строки «Роль · N лет — Вакансия», навыки, «Почему: …» и ссылка на `/employer/jobs/{id}`. Письмо — текстовое, кнопка на ту же вакансию.
6. `/employer/jobs/{id}` показывает до 20 обезличенных карточек `listJobCandidateCards`.
7. `/notifications`: владельцу/админу — переключатель «Агент подбирает кандидатов» (`PUT /api/notifications/company-agent-briefs`).

Код: `src/modules/notifications/service/employer-briefs.ts`, `src/modules/notifications/lib/employer-briefs.ts`, миграция `0036_company_agent_briefs.sql`.

## Админка (D354)

- Страница `src/app/(admin)/[locale]/admin/briefs/page.tsx`, формы `src/components/admin/briefs-controls.tsx`, пункт `briefs` в `src/admin/registry.ts`.
- Данные — `src/modules/notifications/service/briefs-admin.ts`: `readBriefsAdmin` (слоты + `slotView`, пауза, журнал 30 дней, подписки), `updateBriefSlot`, `setBriefsPaused`, `runBriefSlotNow`.
- API: `PATCH /api/admin/briefs/slots/{id}`, `POST /api/admin/briefs/slots/{id}/run` (`{dryRun}`), `PUT /api/admin/briefs/settings` (`{paused}`). Права `jobs_scheduler.manage` / `jobs_scheduler.run`, запись в `audit_log`.
- Боевой повтор за ту же дату слота → 409, ничего не шлётся. Сухой прогон пишет только `brief_runs`.
- `brief_runs.checked_employers` (миграция `0037`) — работодатели внутри общего `checked`.

## Вступление (D355)

- `src/modules/notifications/service/brief-intro.ts` — `writeBriefIntro`: `llmFromEnv` → модель `extract`, таймаут `BRIEF_INTRO_TIMEOUT_MS` (8 с); любая ошибка → шаблон.
- `src/modules/notifications/lib/brief-intro.ts` — `templateIntro` (строки `notifications.briefIntro`), `cleanIntro`.
- `briefCandidate` / `briefEmployer` зовут писатель до транзакции; `payload.intro` читают `telegramText` и `renderEmail`; заметка в `/chat` начинается с вступления.
- Тестовый шов: `writeIntro` в `runSlot` / `runMorningBriefsCron` / `runBriefSlotNow`.
