# CURRENT — состояние сейчас

**Продукт:** `INTGETION JOB LIST`  
**Ветка / worktree:** `feat/email-system-design` · `C:\Users\Admin\Documents\Integetion jobs`  
**Активная задача:** нет. На ветке локально: Spoki (D324), дизайн писем (D330), поле чата (D334), Google и Telegram на входе (D335) — в origin не отправлено.  
**Прод:** https://intgetion.com

## Работает (кратко)

- Auth email+пароль / magic link (Supabase) — см. [how-it-works/auth.md](how-it-works/auth.md)
- Публичный сайт, вакансии, профиль, отклики, matching, админка, уведомления — см. [status/INDEX.md](status/INDEX.md)
- Деплой Vercel + Supabase — [how-it-works/deploy.md](how-it-works/deploy.md)
- OpenRouter для бота (D317) — PARTIAL (зависит от ключа/лимитов)
- Spoki Assistant на `/chat`: черновик в `bot_conversations.state`, один вход «Войти» (D324). Поле чата растёт до потолка, дальше скролл внутри (D334)
- Вход: Google доходит до аккаунта Google и возвращает на сайт (D335). Кнопка X включена (D336). Telegram на кнопке включён
- Уведомления: переключатель «Новые вакансии в Telegram-бот» (D329, с ветки Claude)

## Не работает / отложено

| Тема | Статус | Где |
| ---- | ------ | --- |
| Телефонный Telegram Mini App | OPEN / PARTIAL | [OPEN_TASKS.md](OPEN_TASKS.md), D318–D322 |
| Cross-device email handoff (D328) | DEFERRED | не на этом master; см. OPEN_TASKS |
| X на входе | кнопка есть; провайдер в Supabase ещё выключен — нет клиента в портале разработчика X | D336 |
| Брендированные auth-письма в облачном Supabase | шаблоны не вставлены в Dashboard | D330, `supabase/templates/` |

## Следующий шаг

Только по явной команде основателя. Кандидаты: телефонный Mini App; иначе следующая продуктовая задача из OPEN_TASKS / roadmap.

## Куда читать по задаче

| Задача про… | ТЗ | Как в коде |
| ----------- | -- | ---------- |
| Auth / письма | [tz/00-protocol.md](tz/00-protocol.md) + D7 в registry | [how-it-works/auth.md](how-it-works/auth.md) |
| Бот / TG | [tz/12-bot.md](tz/12-bot.md) | [how-it-works/bot.md](how-it-works/bot.md) |
| Matching | [tz/10-matching.md](tz/10-matching.md) | [how-it-works/matching.md](how-it-works/matching.md) |
| Jobs / apply | [tz/06-api.md](tz/06-api.md) | [how-it-works/jobs-applications.md](how-it-works/jobs-applications.md) |
| Деплой / env | [tz/18-ops.md](tz/18-ops.md) | [how-it-works/deploy.md](how-it-works/deploy.md), [RUNBOOK.md](RUNBOOK.md) |

Обновлять этот файл в **конце каждой сессии**.
