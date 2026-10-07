# How it works

Факт в коде (не ТЗ). Читать файл домена после `tz/*`.

| Файл | Зона | Код (вход) |
| ---- | ---- | ---------- |
| [auth.md](auth.md) | Auth, callback, письма | `src/modules/auth`, `src/app/api/auth`, Supabase |
| [deploy.md](deploy.md) | Vercel / Supabase / Resend | [../RUNBOOK.md](../RUNBOOK.md) |
| [bot.md](bot.md) | Web chat + Telegram | `src/modules/bot`, `src/app/api/bot` |
| [matching.md](matching.md) | Скор и `/matches` | `src/modules/matching` |
| [morning-briefs.md](morning-briefs.md) | Утренние сводки, 3 слота | `src/modules/notifications/service/morning-briefs.ts` |
| [jobs-applications.md](jobs-applications.md) | Вакансии и отклики | `src/modules/jobs`, `applications` |

Статус работы: [../status/INDEX.md](../status/INDEX.md).
