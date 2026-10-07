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

## Код

- `src/modules/notifications/lib/briefs.ts` — слоты, время, окно
- `src/modules/notifications/service/morning-briefs.ts` — cron и `runSlot` (с `dryRun` для админки)
- `src/db/migrations/0032_morning_briefs.sql`, `src/db/schema/briefs.ts`
