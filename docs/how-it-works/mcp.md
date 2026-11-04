# MCP — как устроено

План и фазы: [../MCP.md](../MCP.md). Решения: D480, D484–D486.

## Код

- Адрес: `https://intgetion.com/api/mcp` (`src/app/api/mcp/route.ts`). Streamable HTTP без состояния. OAuth authorization открывается GET с `?oauth=authorize`; серверный MCP transport остаётся stateless и не использует сессии.
- SDK: `@modelcontextprotocol/server` 2.3.1 (официальный v2), `createMcpHandler`. Сервер на каждый запрос новый. Клиенты 2026-07-28 и 2025-era (`initialize`, до 2025-11-25) обслуживаются одной фабрикой.
- Сервер объявляет `tools.listChanged: false`: список меняется только с выкладкой. Поток `subscriptions/listen` получает пустое подтверждение и сразу закрывается, функция Vercel не висит до `maxDuration`.
- Протокол: `src/modules/mcp/service/server.ts`. Порядок на запросе: Host (только хост сайта, вне production ещё loopback) → Origin (нет Origin — можно, иной Origin — 403, `null` — 403) → лимит `mcpGuest` 60 в минуту на IP → тело до 64 КБ → вызов.
- Инструменты берутся из реестра Spoki (`src/modules/bot/service/tools.ts`). У инструмента есть необязательное поле `mcp` (`McpFace`: название, описание, свой формат ответа). `spoki: false` — инструмент только для MCP (`list_job_categories`, `get_company`). `mcpTools()` и `runMcpTool()` пускают в MCP только гостевые инструменты, у которых нет карточки ни для гостя, ни для вошедшего.
- Ответы: `src/modules/bot/service/mcp-faces.ts` (вакансии, компании, категории, события), `src/modules/freelance/service/bot-tools.ts` (услуги, вилка цен). Результат — `structuredContent` и тот же JSON текстом.
- D484: `search_jobs` просит у поиска только свои вакансии и источники из `SYNDICATED_IMPORT_SOURCES` (`searchJobs(..., { syndicatedOnly: true })` → условие в SQL `searchPublicJobs`), поэтому категория, где новые вакансии из закрытых источников, не выходит пустой. Затем каждая вакансия ещё раз проходит `canSyndicateJob` (`src/config/import-sources.ts`). Закрытый источник не отдаётся и по id (`available: false`, `reason: "source_terms"`, только ссылка на страницу). Компания с `origin = imported` — так же. У импортной вакансии `source` с именем и ссылкой, у события — открытый источник.
- Нет: описаний в списках, ссылки отклика, контактов, id продавца, ссылок портфолио, юридических реквизитов компании.
- Proxy: `/api/mcp` вне общей проверки Origin (`needsOriginCheck` в `src/lib/origin.ts`). Все остальные `/api/*`, включая `/api/mcp/...`, под ней. Cookie маршрут не читает.
- Лог: одна строка `mcp_tool_call` на вызов: инструмент, `ok`, время, `ipHash` (`privacyHash`). Без аргументов. Ошибки SDK — только имя (`mcp_error`).

## Авторизация (фаза 2, локальная ветка)

- `src/modules/mcp/service/auth-service.ts`: OAuth public clients, PKCE S256, одноразовые коды, короткие opaque access tokens, rotating refresh tokens с отзывом цепочки при повторном использовании; в БД хранятся только SHA-256 токенов. Resource/audience проверяется при создании согласия, обмене кода, refresh и каждом MCP-вызове.
- `src/modules/mcp/service/oauth-http.ts`: `/api/mcp?oauth=authorize|register|token|revoke`, DCR с ограниченными redirect URI, IP rate limits и лимитом тела; metadata публикуются через `.well-known` и объявляют поддержку CIMD. URL `client_id` разрешается через `cimd.ts`: HTTPS, только публичные A/AAAA, DNS pinning на сокете, запрет redirect, максимум 64 КБ и 2,5 с; документ проверяется и сохраняется как клиент (D608).
- Личный токен годовой, показывается один раз, хранится хешом и отзывается в настройках. Страница настроек «Ассистенты» показывает токены и OAuth-подключения.
- Read scopes: `profile:read`, `applications:read`, `saved:read`, `freelance:read`, `ugc:read`, `reminders:read`. Scoped tools читают профиль, сводку/матчи, отклики, сохранённые вакансии/поиски, подписки, заказы/услуги фриланса, UGC-кампании/приглашения и ожидающие напоминания. Write scope не выдаются.
- Пользовательские MCP-ответы помечаются `UNTRUSTED_NOTE`; профиль формируется из явного списка полей без контактов.
- Страница согласия `/oauth/consent` повторно проверяет пользователя и Origin в серверных действиях. Settings API требуют входа и используют MCP service barrel.
- Миграция `0088_mcp_authorization.sql` создаёт таблицы клиентов, запросов, грантов, кодов и токенов с RLS deny-all; доступ к ним у `app_rw`. На облако миграция не применялась.

## Тесты

- `src/modules/mcp/__tests__/server.test.ts` — обе версии протокола через настоящий обработчик SDK, Host, Origin, 429, 413, D484, отсутствие контактов, лог без аргументов.
- `src/modules/mcp/__tests__/auth-service.integration.test.ts` — consent, PKCE exchange, неверные verifier/client/resource, replay кода и refresh token, principal/scopes/audience и хранение только хэшей; запускается в CI после clean migration.
- `src/modules/bot/__tests__/mcp-tools.test.ts` — состав MCP, только чтение, Spoki не получает MCP-инструменты.
- `src/lib/security.test.ts` — исключение Origin только для `/api/mcp`.

## Проверить руками

```bash
claude mcp add --transport http intgetion https://intgetion.com/api/mcp
```

Локально (`pnpm dev`, база облачная, общая с сайтом): адрес `http://localhost:3000/api/mcp`.

## Модуль коротко

- **Вход:** `src/modules/mcp/service/index.ts` — `handleMcpRequest`, `allowedHosts`, `allowedOrigins`, `MCP_MAX_BODY_BYTES`, `MCP_SERVER_NAME`, `MCP_SERVER_VERSION`.
- **Таблиц нет:** только чтение через инструменты Spoki (модуль bot).
- **Маршрут:** `/api/mcp`.
- **Env:** своих нет; `NODE_ENV` (вне production разрешён loopback). Лимит — `mcpGuest` в `src/lib/rate-limit.ts`.
- **D:** 480, 484–487.

## Что не сделано

Фаза 2 реализована в PR #47, CI run `41934060059` зелёный: clean migration, OAuth DB integration, 104 e2e, unit, typecheck, lint, format и build. Ручная security-проверка OAuth/CIMD/consent/settings выполнена; независимый внешний review не проводился. Фаза не включена в production: после штатного merge требуется применить `0088_mcp_authorization.sql` и выполнить production deploy. Фазы 3 (действия с подтверждением), 4 (работодатель и исполнитель), 5 и 6 остаются планом в [../MCP.md](../MCP.md) §6.
