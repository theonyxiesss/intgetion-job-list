# Bot — как устроено

ТЗ: [../tz/12-bot.md](../tz/12-bot.md).

## Код

- Модуль: `src/modules/bot/**`
- Пустой чат: приветствие по центру, капсула ввода (D409) и три вкладки с четырьмя вопросами из запаса в 20 (D408). Свой текст по-прежнему в поле ввода. На тарифе «Команда» описание роли и критериев ставит вакансию в очередь админа (D411). На сайт не выложено.
- Web chat SSE: `/api/bot/**`, UI `/[locale]/chat`
- LLM: `src/lib/llm/**`, провайдер через env (OpenRouter по D317)
- Telegram-бот: скилл `.claude/skills/intgetion-telegram-bot/` (D410). Вход, Mini App и канал: `.claude/skills/intgetion-telegram/`
- Telegram: webhook routes + Mini App session helpers (D311–D322)
- Канал Jobs Alert: cron `/api/cron/telegram` после личной рассылки, шаблон без LLM (D341)

## Статус

Web chat — OK при валидном LLM-ключе. Phone Mini App — OPEN ([../OPEN_TASKS.md](../OPEN_TASKS.md)).
