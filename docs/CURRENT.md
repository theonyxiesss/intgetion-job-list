# CURRENT — состояние сейчас

**Продукт:** `INTGETION JOB LIST`  
**Ветка / worktree:** `master` · `C:\Users\Admin\Documents\Integetion jobs`  
**Активная задача:** оплата «Команды», Plus и Pro (D358). Миграция `0039`.  
**Прод:** https://intgetion.com. Миграции `0032`–`0039` на облаке. `JOBS_ALERT_CHAT_ID` задан только в production. Выкладка `dpl_3CKKgE4guXtB1SFSj63YWBnAmYiX` стоит на intgetion.com. Приём включён. На тарифах «Найм», «Команда», Plus и Pro открывают оплату. «Старт» бесплатный.

## Работает (кратко)

- Auth email+пароль / magic link (Supabase) — см. [how-it-works/auth.md](how-it-works/auth.md)
- Публичный сайт, вакансии, профиль, отклики, matching, админка, уведомления — см. [status/INDEX.md](status/INDEX.md)
- Деплой Vercel + Supabase — [how-it-works/deploy.md](how-it-works/deploy.md)
- OpenRouter для бота (D317) — PARTIAL (зависит от ключа/лимитов)
- Spoki Assistant на `/chat`: черновик в `bot_conversations.state`, один вход «Войти» (D324). Поле чата растёт до потолка, дальше скролл внутри (D334)
- Вход: Google доходит до аккаунта Google и возвращает на сайт (D335). Кнопка X включена (D336). Telegram на кнопке включён
- Настройки → Аккаунт → «Способы входа»: привязка Telegram, Google и X (D339). Ручная привязка в облачном Supabase включена. На входе и регистрации одно согласие внизу блока, не под каждой кнопкой
- Уведомления: переключатель «Новые вакансии в Telegram-бот» (D329, с ветки Claude)
- Канал Jobs Alert (D341): бот — админ канала, числовой id задан в Vercel production. Старые публикации до водяного знака миграции `0033` не догоняются
- Главная — лента вакансий, футер из трёх групп, меню по типу аккаунта (D342–D344)
- Английский без `/en`, испанский на `/es`, португальский (Бразилия) на `/pt-BR` (D345, D346, D350). Миграция `0035` на облаке. Юридические тексты есть на ru, en и pt-BR; испанский показывает английские
- «Разместить вакансию» в шапке и в профиле: без тарифа сначала тарифы, бесплатный ведёт на форму (D347)
- «Общаться с агентом» снова в шапке, с иконкой; на `/chat` есть ссылка на бота Telegram (D348)
- Утренние сводки: подфаза B (D349) — галочка почты, флаг агента, ссылки в Telegram. Подфаза C — сторона работодателя, D — админка `/admin/briefs`, E — вступление от LLM с шаблоном. Миграции `0036` и `0037` на облаке
- Письма входа, magic link и сброса пароля идут через Send Email Hook на `https://intgetion.com/api/auth/hooks/send-email` (Resend, наш макет). 2026-10-07 хук отработал успешно. HTML в Dashboard не используется, пока хук включён
- Вход через X включён (D336): провайдер OAuth 2.0 в облачном Supabase, кнопка уходит на `x.com`. Секрет только в Supabase
- Оплата (D354–D358): миграции `0038` и `0039`. На `/pricing` «Найм», «Команда», Plus и Pro ведут на оплату. «Старт» бесплатный. Касса показывает цену, 30 дней и выбор USDC или Tether со знаками. Один платёж включает тариф на 30 дней по месячной цене, без автопродления. Лимиты этих карточек не включаются. Платят кошельком в браузере. На Base только USDC. Адрес получателя — один адрес MetaMask, только в production. Тариф появляется только после статуса, который проверил сервер

## Не работает / отложено

| Тема | Статус | Где |
| ---- | ------ | --- |
| Телефонный Telegram Mini App | OPEN / PARTIAL | [OPEN_TASKS.md](OPEN_TASKS.md), D318–D322 |
| Cross-device email handoff (D328) | DEFERRED | код уже на master; живой сценарий отложен, см. OPEN_TASKS |

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
