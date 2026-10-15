# Журнал проверок безопасности

Читать **перед** любым аудитом безопасности (скилл [`intgetion-security`](../../.claude/skills/intgetion-security/SKILL.md), D419). Журнал говорит, что уже проверено и на каком коммите, чтобы следующий аудит не повторял ту же работу.

## Как пользоваться

1. Найдите область в последней записи. Повторно проверять область нужно, только если её файлы менялись после указанного коммита:

   ```bash
   git diff --stat <коммит> -- <файлы области>
   ```

   Пустой вывод — область не трогали, отметьте «без изменений с <коммит>». Если запись помечена «+ рабочая папка», сравнивайте ещё и с незакоммиченными правками того дня (они перечислены в записи).

2. Новая запись — сверху, под этим разделом. Формат: дата, коммит, по каждой области «что проверено» (файлы, функции, маршруты), «результат» (OK или находка `SEC-<дата>-<n>` с серьёзностью), «не проверялось и почему».
3. Находки, требующие правок в нескольких модулях, миграции, решения основателя или облака, переносятся в [OPEN_TASKS.md](../OPEN_TASKS.md). Закрытую находку отметьте в её строке: коммит исправления и дата.
4. Никаких секретов, значений env, токенов и персональных данных в журнале. Только имена переменных.
5. Активные атаки на https://intgetion.com запрещены. Допустим один обычный `curl -sI` для чтения заголовков.

Серьёзность: **High** — эксплуатируется сразу (обход входа, утечка данных, деньги). **Medium** — нужны условия, но последствия заметные. **Low** — усиление защиты. **Info** — заметка без риска сейчас.

---

## 2026-10-15 — вход Mini App с телефона, рабочая папка (D429)

Не полный аудит. Область: `POST /api/auth/telegram/miniapp`, `verifyTelegramInitData` в `src/modules/auth/service/telegram.ts`. Способ: чек-лист скилла `intgetion-security` по этому диффу.

- Проверка Origin не снималась. Тело формы по-прежнему до 8192 байт, схема zod та же. Подписанная строка не попадает в адрес, в HTML ответа и в лог. Лог — только `result: ok` или `invalid`.
- HTML успеха содержит только путь `/?tgb=1` или `/xx?tgb=1`. Чужой адрес подменяется на `/?tgb=1`.
- Кука сессии пишется через `cookies().set`, не сырым `Set-Cookie` на ответе. Лимит `login` тот же. Новый хост в CSP не добавлялся. Миграции нет.

Результат по этому диффу: OK. Телефон после выкладки ещё не проверялся.

## 2026-10-14 — полный аудит, `c122d70` + рабочая папка

Проверено на коммите `c122d70` вместе с незакоммиченными правками того же дня: D413/D417 (форма `/services`, `/api/company/briefs`, `0048_engagement_briefs.sql`, `/admin/engagements`), D416 (карьерные страницы в импорте), D420/D422 (CSP кассы, выбор MetaMask в `src/modules/billing/ui/`), правки бота D411/D423. Способ: чтение кода по чек-листу скилла `intgetion-security`, встроенный `/security-review` (видел только диф `c122d70` — одни документы, находок нет), `pnpm audit`, Supabase security advisors (только чтение), один `curl -sI` на прод.

### Находки

| ID              | Серьёзность | Область            | Суть                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Статус                                                                                    |
| --------------- | ----------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| SEC-20261014-1  | Medium      | Админка            | Пока `ADMIN_HOST_ONLY` не включён, `authorizeAdmin` (`src/modules/admin-console/service/console-service.ts`) пускает «legacy»-админа основного сайта по обычной сессии Supabase: без второго фактора, без проверки права роли (`can()` не вызывается) и без step-up для опасных действий (`evaluateAdminAction` в `src/admin/action-policy.ts` пропускает step-up при `legacy`). Кража пароля админа = полная админка. Включён ли флаг на проде — не проверялось (значения env не читаются).                   | OPEN_TASKS                                                                                |
| SEC-20261014-2  | Medium      | Крипто-оплата      | Захват хэша транзакции. `confirmHireOrder` (`src/modules/billing/service/billing-service.ts`) записывает `tx_hash` в заказ и при неудаче (`wrong_payer` → `failed`, `missing` → `submitted`). Индекс `crypto_orders_tx_idx` уникален по `(chain, tx_hash)` для любого статуса (`0038_billing_hire.sql`). Злоумышленник с собственным заказом подаёт чужой хэш из мемпула раньше плательщика — у плательщика потом 409 `HASH_USED` или 500, деньги пришли, тариф не выдан. Исправление требует миграции.        | Код готов (D425, `0049`) в ветке `claude/relaxed-dubinsky-64ce8a`; не влито, не на облаке |
| SEC-20261014-3  | Medium      | Бот, лимиты        | Гостевой лимит Spoki (`botGuest`, 5 в сутки) ключуется `ip:хэш cookie сессии` (`enforceMessageLimits` в `src/modules/bot/service/conversation.ts`). Без cookie гость получает новую сессию и ещё 5 сообщений — с одного IP без предела. Останавливает только суточный бюджет `LLM_DAILY_BUDGET_USD`, после которого Spoki молчит для всех. Нужен ещё бакет только по IP (решение о лимите — D).                                                                                                                | OPEN_TASKS                                                                                |
| SEC-20261014-4  | Low         | Вход в админку     | `POST /api/admin-auth/mfa/verify` и `/passkey/verify` считают ошибки (`noteAdminLoginFailure`), но не вызывают `assertAdminLoginOpen` перед проверкой — блокировка после 5 ошибок на втором шаге не действует. Нужен пароль (первый шаг блокируется), у Supabase свой лимит MFA, коды восстановления 8 символов из 32 (2^40). Правка в одну строку, но это auth — вынесено в задачу.                                                                                                                           | OPEN_TASKS                                                                                |
| SEC-20261014-5  | Low         | Компании           | `POST /api/companies/:id/members`: владелец любой компании узнаёт, есть ли аккаунт с почтой (404 `NO_ACCOUNT`), без лимита. Человек добавляется в команду без своего согласия.                                                                                                                                                                                                                                                                                                                                 | OPEN_TASKS                                                                                |
| SEC-20261014-6  | Low         | Supabase Auth      | Advisor: выключена проверка утёкших паролей (HaveIBeenPwned). Локальный блок-лист и минимум длины есть (`passwordSchema`). Включает основатель в Auth settings (безопасная зона).                                                                                                                                                                                                                                                                                                                              | OPEN_TASKS                                                                                |
| SEC-20261014-7  | Low         | БД                 | `enable_rls_deny_all` (`0001_enums_and_users.sql`) выдаёт DML ролям `anon` и `authenticated` и держит запрет на политиках `USING (false)`; плюс политика `app_rw` `USING (true)`. Сейчас доступа нет (advisor не нашёл таблиц без RLS), но запрет держится на одной политике. Скилл описывал «без политик» — исправлено в тексте скилла. Advisor: у 4 функций изменяемый `search_path` (`set_updated_at`, `enable_rls_deny_all`, `skill_similarity`, `candidate_titles_valid`), ни одна не `SECURITY DEFINER`. | OPEN_TASKS (вместе с -6)                                                                  |
| SEC-20261014-8  | Low         | `/services` (D413) | Незакоммичено. `limitEngagementBrief` — второй лимитер вне `rateRules` (бакет `engagementBrief`, 5/час на IP), вопреки правилу скилла. `/admin/engagements` показывает контакты (`reply`) без записи `audit_logs` о чтении контактов (16.1). Хозяину файлов — до коммита.                                                                                                                                                                                                                                      | OPEN_TASKS                                                                                |
| SEC-20261014-9  | Info        | Тела запросов      | `readJson` (`src/lib/http/handler.ts`) не ограничивает размер тела; хук Send Email читает `request.text()` до проверки подписи; вебхук Telegram сверяет только заголовок `content-length`. Держит лимит Vercel 4.5 MB.                                                                                                                                                                                                                                                                                         | —                                                                                         |
| SEC-20261014-10 | Info        | Админ-хост         | `isAdminSurface` (`src/admin/host.ts`) знает только префиксы `en` и `ru`; `/de/admin` и др. не получают 404 от прокси при `ADMIN_HOST_ONLY`. `authorizeAdmin` всё равно отдаёт 404 — только эшелон защиты.                                                                                                                                                                                                                                                                                                     | —                                                                                         |
| SEC-20261014-11 | Info        | Касса CSP          | D420: `style-src 'self' 'unsafe-inline'` без nonce только на `/billing/crypto` — возможна лишь CSS-инъекция, React экранирует текст. D422: `blob:` в `img-src` только на кассе. Тесты в `security.test.ts` есть. На проде 2026-10-14 `blob:` ещё нет (D422 не выложен).                                                                                                                                                                                                                                        | —                                                                                         |
| SEC-20261014-12 | Info        | Секреты в клиенте  | `import "server-only"` есть только в `src/lib/llm/anthropic.ts`. `src/lib/supabase/admin.ts` (service role) его не имеет; клиентских импортов сейчас нет, Next не встраивает env без `NEXT_PUBLIC_`.                                                                                                                                                                                                                                                                                                           | —                                                                                         |
| SEC-20261014-13 | Info        | Зависимости        | `pnpm audit --prod`: уязвимостей нет. Полный `pnpm audit`: 1 high в dev-зависимости `braces` (через `eslint-config-next`), исправленной версии нет, в прод не попадает.                                                                                                                                                                                                                                                                                                                                        | —                                                                                         |

### Области

**Заголовки и CSP** — OK (кроме Info -11).
Проверено: `src/lib/security-headers.ts` (`buildCsp`, `createNonce`, `staticSecurityHeaders`, `apiCsp`), `next.config.ts`, `src/proxy.ts` (nonce, bounce-страница Mini App, matcher), `src/lib/crypto-pay-path.ts`, `src/lib/embedded-sites.ts` (пусто, D400), `src/lib/security.test.ts`. Живой `curl -sI`: `/` (bounce Mini App), `/billing/crypto` (307 на вход, CSP кассы), `/api/health` (`apiCsp`). HSTS 2 года, nosniff, Referrer-Policy, Permissions-Policy на месте; `X-Frame-Options` снят при Mini App, `frame-ancestors` решает (D259).
Не проверялось: CSP в браузере под входом (нужен пароль).

**Origin/CSRF** — OK.
Проверено: `src/lib/origin.ts` (`isAllowedOrigin`, `SECRET_AUTHENTICATED` = вебхук Telegram и хук Send Email, оба сверяют подпись), `csrfSite`/`hostOrigin` в `src/admin/host.ts`, ветка `/api/` в `src/proxy.ts`. Server actions (`"use server"`) в проекте нет. Cookies `sb-*`: HttpOnly, Lax; в кадре Telegram — None + Partitioned (`src/lib/supabase/cookie-options.ts`, D314/D315).

**Гарды и IDOR в `src/app/api/**`** — OK, кроме SEC-1, -4, -5.
Проверено: все 126 `route.ts` по списку методов и вызовов (`requireUser`, `requireCandidate`, `requireMembership`, `requireAdminPermission`/`openAdminAction`, `CRON_SECRET`). Владение строкой прочитано в `openApplication`, `patchApplicationStatus`, `readApplicationContacts` (+ `audit_logs`), `getCandidateForViewer`, `refreshHireOrder`/`loadOrder`, `setSearchAlert`/`deleteSavedSearch`, `editCompany`/`assertCanEditCompany`, `findOwnedJob` + `requireMembership`, верификация компании (`ownedCompany`, домен из профиля, бесплатные почты запрещены). 18 из 20 страниц админки вызывают `requireAdminPage`/`requireAdminPermission`; `login` и `mfa` открыты намеренно. Админ-хост: сессия по хэшу токена, step-up для опасных действий.
Не проверялось построчно: сервисы `matching`, `notifications/*`, `bot/fill`, `bot/confirm`, `hire`, `auth/telegram/link|unlink`, `auth/oauth/unlink`, `me/export` — гард в маршруте есть, логика владения внутри сервиса не читалась.

**RLS deny-all и `app_rw`** — OK, кроме SEC-7.
Проверено: все 64 таблицы (`CREATE TABLE`) в `src/db/migrations/0001…0048` вызывают `enable_rls_deny_all` (включая незакоммиченную `0048`); `GRANT … TO app_rw` через default privileges; `schema_migrations` закрыт, кроме одной строки для `app_rw` (`0033`); ни одного `VIEW`, `SECURITY DEFINER`, `sql.raw`; TLS к БД с CA (`src/db/ssl.ts`, `rejectUnauthorized: true`). Supabase advisors (облако): таблиц без RLS нет.
Не проверялось: `src/db/rls.integration.test.ts` и `pnpm db:verify` (нужен `supabase start`, CI).

**Секреты** — OK.
Проверено: `.gitignore` (`.env*`, кроме `.env.example`); `git ls-files` — только `.env.example` и публичный корневой сертификат `src/db/supabase-root-2021-ca.pem`; поиск по шаблонам ключей (OpenAI/Anthropic `sk-`, Resend `re_`, JWT, токен бота, `whsec_`, строки подключения) в отслеживаемых и неотслеживаемых файлах — только заглушки в тестах. `NEXT_PUBLIC_*`: `SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WALLETCONNECT_PROJECT_ID` — все публичные по смыслу. Логгер редактирует `email`, `phone`, `password`, `token`, `authorization`, `cookie`, `ip` (`src/lib/logger.ts`).
Не проверялось: история git на секреты (gitleaks не установлен локально; его гоняет CI на каждый push), значения в Vercel.

**Лимиты запросов** — OK, кроме SEC-3, -5, -8.
Проверено: `rateRules` в `src/lib/rate-limit.ts` и все вызовы `enforceRateLimit` (маршруты и сервисы: `apply`, `verificationRequest`, `dataExport`, `botGuest/User/Plus/Pro`, job create). Вход, magic link, регистрация, сброс, Telegram, биллинг, отчёты, гостевой JSON каталога — с бакетами. Без бакета (низкий риск): создание компании, загрузка логотипа, `members`, `hire`, `bot/fill`.

**Подписи** — OK.
Проверено: `src/lib/signed-token.ts` (purpose в подписи, `exp` обязателен, `timingSafeEqual`); Telegram Login Widget и `initData` (`src/modules/auth/service/telegram.ts`, HMAC, возраст ≤ 1 ч), секрет вебхука (производный, сравнение `timingSafeEqual`); хук Send Email (`send-email-hook.ts`, Standard Webhooks, окно 5 мин, `timingSafeEqual`); все 15 `src/app/api/cron/*` — `Bearer $CRON_SECRET`, 404 без секрета, `timingSafeEqual`, без секрета в env — отказ. Коды входа через бота и токены верификации хранятся как хэш.

**Крипто-оплата** — OK, кроме SEC-2.
Проверено: `src/lib/billing/verify-transfer.ts` (статус, Transfer нужного контракта, получатель, плательщик, сумма, возраст, подтверждения, OFAC), `status.ts` (`settlement`), `billing-service.ts` (`createCryptoOrder` берёт цену из плана, а не из запроса; `verifyWalletSignature` — сообщение и nonce с сервера, одноразовый nonce; `confirmHireOrder` — транзакция, уникальный хэш в `payments`), маршруты `/api/billing/crypto/*` (гарды, бакеты). Клиентские правки D422 (`connect-wallet.ts`, `crypto-pay.tsx`) отправляют на сервер только хэш и подпись — сервер ничего от них не принимает на веру.
Не проверялось построчно: проверки Tron/Solana (`verifyTronTransfer`, `verifySolanaTransfer`, `src/lib/billing/non-evm/`).

**Бот Spoki и недоверенный текст** — OK, кроме SEC-3.
Проверено: `src/modules/bot/service/tools.ts` (`runTool`: доступ `user`/`guest`, подтверждение с хэшем аргументов и `userId`; `save_job`/`hide_job` без подтверждения — так в ТЗ `12-bot.md`), `wrapUntrusted` (`src/lib/llm/untrusted.ts`: экранирование, обрезка, управляющие символы) во всех местах, где в модель идёт текст вакансии, пользователя или брифа; системный промпт про `<untrusted_data>`; вывод в `src/components/bot/chat.tsx` — текст, ссылки только на свои пути.
Не проверялось: `telegram-agent.ts` построчно, `pnpm eval` (бот не менялся этим аудитом).

**Открытые редиректы** — OK.
Проверено: `src/components/auth/login-next.ts` (allowlist `RETURN_PATHS`), `src/app/[locale]/auth/callback/route.ts`, `publicAuthRedirect` в хуке почты (чужой хост → путь на своём сайте), `signedInPath`, OAuth `oauthNext`. `window.location.assign` только со своими или проверенными `publicHttpUrl` адресами.

**Загрузка файлов** — OK.
Проверено: `src/modules/companies/service/logo-service.ts` (≤ 2 MB, MIME по сигнатуре и заявленный совпадают, `sharp` с лимитом пикселей, перекодировка в webp 256×256, имя `randomUUID`), `readFormDataLimited` (потоковый лимит), отдача `GET …/logo` с `isSafeLogoPath` и `nosniff`. CV-загрузки нет.

**XSS** — OK.
Проверено: `dangerouslySetInnerHTML` — только `themeScript`, `telegramHashScript` (константы под nonce) и `serializeJsonLd` (экранирует `<`, `>`, `&`). Внешние ссылки вакансий и компаний — через `publicHttpUrl` (`src/lib/company-mark.ts`, только http/https). Письма — `escapeEmailHtml` по умолчанию (`src/lib/email-html.ts`). Markdown-рендерера нет.

**Ловушка для парсеров (D218)** — OK.
Проверено: `src/app/api/catalog-export/route.ts` — 404, лог `scrape.trap` с хэшем IP. Dev-маршруты: `/dev-emails/*` и `/dev/ui` — 404 в production.

**Зависимости** — см. SEC-13.

### Не проверялось в этом аудите

- Активное тестирование прода (запрещено), e2e и интеграционные тесты (CI, Docker нет).
- Настройки Supabase Auth кроме advisor (redirect URLs, длительность сессии, MFA), правила Vercel Firewall, значения переменных Vercel (включён ли `ADMIN_HOST_ONLY`).
- Содержимое `.cursor/mcp.json` и токены инструментов агентов (вне репозитория; см. OPEN QUESTION в MISSION_LOG от 2026-10-14).
