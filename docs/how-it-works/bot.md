# Bot — как устроено

ТЗ: [../tz/12-bot.md](../tz/12-bot.md).

## Код

- Модуль: `src/modules/bot/**`
- Пустой чат: приветствие по центру, капсула ввода (D409) и три вкладки с четырьмя вопросами из запаса в 20 (D408). Свой текст по-прежнему в поле ввода. На тарифе «Команда» описание роли и критериев ставит вакансию в очередь админа (D411). На сайт не выложено.
- События (D435): `find_events` читает предстоящие события по темам, стране и удалённой работе (гостю тоже), ссылка — карточка `offer_step` `events` → `/events`. Промпт версии 17: предлагать событие как нетворкинг, не на каждом сообщении. См. [events.md](events.md)
- Фриланс-услуги (D460): инструменты из `src/modules/freelance/service/bot-tools.ts`, ссылки на работы и результат — поля карточки (`cardFields`), мимо модели. Входы `/chat?service=`, `/chat?order=`; открытые карточки нити отдаёт `GET /api/bot/conversation`, из Telegram карточка открывается по `/chat?confirm=<id>`. D493: создание услуги идёт в `freelance_service_drafts`, общий с `/profile/freelance/new` (`/api/freelance/service-draft`); `patch_service_draft` пишет частичные факты, ссылки модель не получает, явный `confirm_service_draft` отправляет на модерацию. Eval: `evals/freelance`
- Вакансии (D494): `/chat?from=post_job` и Telegram `/post_job` открывают фиксированный режим создания; natural intent запускает тот же режим у вошедшего пользователя. `patch_job_draft` пишет только сообщённые поля в общий `job_drafts`, форма `/post-job?draft=` редактирует тот же черновик. Контекст включает JSON и обязательные пробелы на каждом ходе; инструментов в режиме только patch/confirm/reset. Контакты заполняются в форме; подтверждение вызывает существующий hire submit и очередь модерации. Telegram показывает кнопку на форму, публикация завершается на сайте.
- UGC-видео (D457, D464): инструменты из `src/modules/ugc/service/bot-tools.ts`; `ugc_price_range` (гость) — сумма награды только из ориентира, `get_ugc_summary` — шаги своих брифов (шаг `deposit`, D466); `get_ugc_campaign` отдаёт компании `budgetRequired`/`budgetPaidIn`. Следующий шаг при открытии нити брифа или приглашения — строка-шаблон и карточка или кнопка (`ugc-next.ts`, D467). Промпт версии 26. Eval: `evals/ugc`
- Память Spoki (D469): `service/user-memory.ts` (проверка факта, блок `MEMORY`, профиль → черновик), `repo/memory-repo.ts`, инструменты `remember_fact`/`forget_fact`, API `/api/bot/memory`, раздел в `/settings/privacy`. Промпт версии 27. Eval: `evals/memory`
- Действия на аккаунте (D472): `service/account-tools.ts`; у записи `preview` называет цель до карточки (чужое — 404, карточки нет), карточка `src/components/bot/account-card.tsx`, тексты `chat.account`. Промпт 28. Eval: `evals/account`
- Вакансии работодателя (D498): `service/employer-job-tools.ts` — `get_my_jobs`, `get_my_job`, `propose_job_update`, `set_job_status` (publish, pause, resume → `extend`, close; «удалить» = close). Права как в кабинете: `findOwnedJob` + роль owner/admin/recruiter. Правка передаёт только названные поля (`namedJobPatch`): схема сайта сама подставляет remote и пустые навыки, их отбрасываем; связанные поля (место, валюта зарплаты) проверяются вместе с текущей вакансией. Карточки — те же `account-card.tsx`, тексты `chat.account.set_job_status`, `propose_job_update`, `jobFields`. Только общая беседа вошедшего; в черновиках UGC/услуги/вакансии их нет. Промпт 33.
- Письмо работодателю (D475): `service/pitch.ts` — `get_pitch_facts`, `screenCoverNote`; карточка отклика `ApplyCardText` показывает письмо. Промпт 31. Eval: `evals/pitch`
- Приветствие вместо ответа (D474): `service/greeting.ts`, один повтор раунда с подсказкой
- Напоминания (D473): `service/reminders.ts`, `repo/reminder-repo.ts`, таблица `bot_reminders` (`0059`); отправка `runReminderDispatch` из `/api/cron/telegram`; тексты `reminders.telegram`, карточки `chat.account.create_reminder`/`cancel_reminder`. Промпт 29 (`NOW` — местное время человека)
- Переписка 24 часа (D471): `listMessages` читает только последние сутки; крон `/api/cron/retention` каждый час стирает текст и `tool_call` старше суток (счётчики токенов и расходов остаются до 180 дней) и удаляет карточки подтверждения старше суток. Срок — `src/config/retention.ts`
- Web chat SSE: `/api/bot/**`, UI `/[locale]/chat`
- LLM: `src/lib/llm/**`, провайдер через env (OpenRouter по D317)
- Telegram-бот: скилл `.claude/skills/intgetion-telegram-bot/` (D410). Вход, Mini App и канал: `.claude/skills/intgetion-telegram/`
- Telegram: webhook routes + Mini App session helpers (D311–D322)
- Канал Jobs Alert: cron `/api/cron/telegram` после личной рассылки, шаблон без LLM (D341)

## Статус

Web chat — OK при валидном LLM-ключе. Phone Mini App — OPEN ([../OPEN_TASKS.md](../OPEN_TASKS.md)).
