# Matching — как устроено

ТЗ: [../tz/10-matching.md](../tz/10-matching.md).

## Код

- `src/modules/matching/**` — hard-фильтры, компоненты скора, explain
- Результаты: таблица `matching_results`, API `/api/matches`, UI `/matches`
- Пересчёт при публикации — очередь pg-boss
- Деньги/TZ: `src/lib/money.ts`, `src/lib/tz.ts`

Эмбеддинги выключены (D11).

## Модуль коротко

- **Вход:** `src/modules/matching/service/index.ts` — скор (`scoreCandidate`, `buildMatch`, `hardFilter`, компоненты навыков, роли, зарплаты, пересечения часовых поясов, опыта и языков), объяснение (`explainMatch`), выдача (`getMatches`, `loadMatchScreen`, `listMatchPage`, `dismissMatch`), пересчёт (`enqueueMatchJob`, `runMatchingCron`). Порог показа — `SHOW_THRESHOLD`, версия алгоритма — `ALGO_VERSION`.
- **Файлы:** `score/*` (чистые правила), `service/compute.ts`, `service/feed.ts`, `service/recalc.ts`, `repo/matching-repo.ts`, `ui/match-card.tsx`, `ui/why-it-fits.tsx`. Эмбеддинги — заглушка `NoopSemanticProvider` (`score/semantic.ts`).
- **Таблицы:** `matching_results` (`0015_matching_results.sql`), очередь `matching_jobs` (`0016_matching_jobs.sql`); читает анкеты кандидатов, вакансии, `fx_rates`, `user_job_feedback`.
- **Маршруты:** `/matches`, блок на `/jobs/[id]`, API `/api/matches`, `/api/matches/[jobId]/feedback`, cron `/api/cron/matching` каждую минуту.
- **Env:** `EMBEDDINGS_ENABLED` (выключен, D11).
- **D:** 11, 19, 30, 90–94, 160, 161, 163, 203, 507, 509. Утренние сводки берут ту же ленту — [morning-briefs.md](morning-briefs.md).

## Что не сделано

Открытых задач по подбору в `OPEN_TASKS.md` нет. Семантический компонент выключен по решению D11.
