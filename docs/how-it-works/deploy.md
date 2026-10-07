# Deploy — как устроено

ТЗ: [../tz/18-ops.md](../tz/18-ops.md). Полная таблица env: [../RUNBOOK.md](../RUNBOOK.md).

## Окружения

| Где | Назначение |
| --- | ---------- |
| Vercel Production | https://intgetion.com |
| Supabase cloud | Auth + Postgres (`app_rw`, миграции отдельно) |
| Resend | Транзакционные письма каталога |
| GitHub Actions | lint / typecheck / test / build / e2e + `supabase start` |

## Практика

- Миграции на облако после merge — по протоколу (не каждый агент).
- Секреты только в Vercel / `.env.local`, не в git.
- CSRF: `Origin` должен совпадать с `NEXT_PUBLIC_SITE_URL`.
- Cron: `/api/cron/*` + `CRON_SECRET`.

Подробности и алерты — только RUNBOOK, сюда не копировать.
