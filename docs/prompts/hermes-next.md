# Hermes — что делать дальше

Ты Hermes. Ветка `hermes/runbook`, папка `C:\Users\Admin\Documents\Integetion jobs runbook`.
Cursor в это время заканчивает 6B (`cursor/6b`) и дальше берёт 7B и 9B. Не бери эти подфазы и не правь их файлы.

## Срочно, до любой новой фичи

CI всех веток красный: `actions/checkout` с `fetch-depth: 0` сканирует gitleaks по всей истории, и на твоём коммите `557039a` срабатывает правило `generic-api-key`.

В `src/lib/env-rules.test.ts` замени фиктивные секреты. Нельзя оставлять строки вида `re_…` и `sk-ant-…`. Поставь явные заглушки без формы ключа, например `resend-example` и `anthropic-example`. Смысл проверок (пара ключ+адрес, prod требует оба) не ослабляй.

Потом на своей ветке:

```
gitleaks detect --source . --no-banner --log-opts="hermes/runbook" --exit-code 1
```

Должно быть 0. Закоммить `11B: drop key-shaped fixtures so gitleaks is clean`, запушь только `origin hermes/runbook`. В `master` не пушь и 6B не вливай.

## Твоя зона — остаток 11B

Уже сделано и больше не переписывай без нужды: `docs/RUNBOOK.md`, `scripts/env-rules.mjs`, `scripts/check-env.mjs`, D191–D194.

Дальше только запуск, решения D195–D199 (D180–D189 заняты под 7B и 9B, не используй):

1. Sentry включается только если задан `SENTRY_DSN`. Без DSN приложение работает как сейчас, тесты не ходят в сеть.
2. Алерты раздела 18.1 — проверки и запись в RUNBOOK, не новый продукт и не пейджер. Очередь pg-boss в MVP нет: для matching и писем напиши, что смотреть таблицу очереди и cron.
3. `/admin/metrics` — только чтение для админа (чужому 404, как остальные `/admin`). Цифры из SQL: регистрации, вакансии, отклики за сутки, взаимные интересы, очередь модерации. Без графиков и без новых таблиц, если хватает запросов.
4. Бэкап и restore не автоматизируй против облака. В RUNBOOK оставь шаги Supabase и что проверено локально в CI, если проверки нет — так и напиши.
5. Prod seed не запускай на облаке.

11A (ревизия лимитов, CSP, нагрузочный тест) не начинай. 8B не начинай: нет записи основателя в MISSION_LOG.

## Не трогать

Это делает Cursor:

- `src/modules/matching/**`
- `src/app/api/matches/**`, `src/app/api/cron/matching/**`
- `src/app/[locale]/matches/**`
- `src/modules/bot/**`, `evals/**`, страница `/chat`
- `src/modules/notifications/**` (дайджест 9B)
- шапка: пункт «Подходящие» и будущая ссылка на `/chat`

Общие файлы только дописывай в конец: `docs/DECISIONS.md`, `docs/ERD.md`, `MISSION_LOG.md`. В `src/messages/en.json` и `ru.json` — свой верхний ключ `metrics`, файл целиком не переформатируй. `vercel.json` не меняй, пока 6B не влита в `master`: там появится cron `/api/cron/matching`.

Чужие инфраструктурные файлы не трогай: `src/proxy.ts`, `src/lib/http/**`, `src/lib/supabase/**`, `src/lib/auth-guards.ts`, `src/lib/rate-limit.ts`, `src/lib/audit.ts`, `next.config.ts`, `.github/workflows/ci.yml`, `scripts/ci-*.sh`.

Перед отчётом: `git fetch && git rebase origin/master`. Конфликты в DECISIONS, MISSION_LOG, messages — оставь обе стороны. `git push --force-with-lease` только в `hermes/runbook`.
