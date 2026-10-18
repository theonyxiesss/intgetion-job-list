# MCP — как устроено

План и фазы: [../MCP.md](../MCP.md). Решения: D480, D484–D486.

## Код (фаза 1)

- Адрес: `POST https://intgetion.com/api/mcp` (`src/app/api/mcp/route.ts`). Streamable HTTP без состояния. GET и DELETE отвечают 405: сессий нет.
- SDK: `@modelcontextprotocol/server` 2.3.1 (официальный v2), `createMcpHandler`. Сервер на каждый запрос новый. Клиенты 2026-07-28 и 2025-era (`initialize`, до 2025-11-25) обслуживаются одной фабрикой.
- Протокол: `src/modules/mcp/service/server.ts`. Порядок на запросе: Host (только хост сайта, вне production ещё loopback) → Origin (нет Origin — можно, иной Origin — 403, `null` — 403) → лимит `mcpGuest` 60 в минуту на IP → тело до 64 КБ → вызов.
- Инструменты берутся из реестра Spoki (`src/modules/bot/service/tools.ts`). У инструмента есть необязательное поле `mcp` (`McpFace`: название, описание, свой формат ответа). `spoki: false` — инструмент только для MCP (`list_job_categories`, `get_company`). `mcpTools()` и `runMcpTool()` пускают в MCP только гостевые инструменты, у которых нет карточки ни для гостя, ни для вошедшего.
- Ответы: `src/modules/bot/service/mcp-faces.ts` (вакансии, компании, категории, события), `src/modules/freelance/service/bot-tools.ts` (услуги, вилка цен). Результат — `structuredContent` и тот же JSON текстом.
- D484: вакансии проходят `canSyndicateJob` (`src/config/import-sources.ts`). Закрытый источник не отдаётся и по id (`available: false`, `reason: "source_terms"`, только ссылка на страницу). Компания с `origin = imported` — так же. У импортной вакансии `source` с именем и ссылкой, у события — открытый источник.
- Нет: описаний в списках, ссылки отклика, контактов, id продавца, ссылок портфолио, юридических реквизитов компании.
- Proxy: `/api/mcp` вне общей проверки Origin (`needsOriginCheck` в `src/lib/origin.ts`). Все остальные `/api/*`, включая `/api/mcp/...`, под ней. Cookie маршрут не читает.
- Лог: одна строка `mcp_tool_call` на вызов: инструмент, `ok`, время, `ipHash` (`privacyHash`). Без аргументов. Ошибки SDK — только имя (`mcp_error`).

## Тесты

- `src/modules/mcp/__tests__/server.test.ts` — обе версии протокола через настоящий обработчик SDK, Host, Origin, 429, 413, D484, отсутствие контактов, лог без аргументов.
- `src/modules/bot/__tests__/mcp-tools.test.ts` — состав MCP, только чтение, Spoki не получает MCP-инструменты.
- `src/lib/security.test.ts` — исключение Origin только для `/api/mcp`.

## Проверить руками

```bash
claude mcp add --transport http intgetion https://intgetion.com/api/mcp
```

Локально (`pnpm dev`, база облачная, общая с сайтом): адрес `http://localhost:3000/api/mcp`.
