# Bot — как устроено

ТЗ: [../tz/12-bot.md](../tz/12-bot.md).

## Код

- Модуль: `src/modules/bot/**`
- Web chat SSE: `/api/bot/**`, UI `/[locale]/chat`
- LLM: `src/lib/llm/**`, провайдер через env (OpenRouter по D317)
- Telegram: webhook routes + Mini App session helpers (D311–D322)

## Статус

Web chat — OK при валидном LLM-ключе. Phone Mini App — OPEN ([../OPEN_TASKS.md](../OPEN_TASKS.md)).
