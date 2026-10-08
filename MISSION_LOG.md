# MISSION_LOG

## [2026-10-08] — касса после Google и X, потолок Spoki — DONE

- Сделано: Google и X несут тот же список возврата, что и пароль, включая оплату Plus, Pro, «Найм» и «Команда». Чужой адрес отбрасывается. Бесплатный вошедший остаётся на 15 сообщениях Spoki в сутки, гость на 5. Живой Plus даёт 100, Pro — 300. Условия 10.5 и страница тарифов говорят это же и по-прежнему не обещают более сильную модель, блок «Продвигается», места в команде и автоматический возврат. Промпт версии 7. Пояс компании и флаг поиска кандидата не мигрировались.
- Команды проверки: `pnpm legal:sync` → 0; vitest входа, потолка, условий, сообщений и тарифов → 6 файлов, 58 прошло; `tsc --noEmit` → 0; eslint по затронутым файлам → 0.
- P-тесты подфазы: страница входа с `next=billing-plus` должна отдавать ссылку Google с этим ключом.
- Миграции: нет.
- Изменённые файлы: `login-next.ts`, callback, oauth-redirect, вход и регистрация, `rate-limit.ts`, `conversation.ts`, промпт, сообщения, условия, D363, D364, ТЗ сводок и бота.
- Отклонения от ТЗ: раздел 12.5 всё ещё писал 30 и 200; в коде с D323 уже 5 и 15, текст ТЗ приведён к коду.
- OPEN QUESTION: юрлицо по-прежнему пустое. Испанские условия ждут перевода уже выложенного текста.
- Следующая подфаза: только по команде.

## [2026-10-08] — тарифы и условия говорят правду об оплате — DONE (не выложено)

- Сделано: на тарифах больше не написано, что планы готовятся, что возврат уходит сам и что карты идут через Stripe. Условия, пункт 10.5, версия `2026-10-08`: USDT или USDC, 30 дней, без автопродления, возврат «Найма» вручную. Блок «Продвигается», лимиты агента и места в команде этим платежом не включаются.
- Команды проверки: `pnpm legal:sync`; vitest юридических текстов и сообщений → 14 прошло.
- P-тесты подфазы: страница тарифов в браузере после выкладки.
- Миграции: нет.
- Изменённые файлы: сообщения en/ru/es/pt-BR, `legal-terms.md`, `legal.json`, `legal.ts`, D363.
- Отклонения от ТЗ: нет. Включение лимитов карточек не делалось: этих систем ещё нет.
- OPEN QUESTION: юрлицо по-прежнему пустое.
- Следующая подфаза: только по команде. На прод не выкладывалось.


## [2026-10-08] — кнопки Spoki в Telegram — DONE (не выложено)

- Сделано: вакансия, оплата, тарифы, регистрация, размещение и вход из чата Telegram уходят кнопкой на страницу сайта. Адрес собирает сервер. Нажатие не подтверждает отклик и не включает тариф.
- Команды проверки: vitest Telegram-агента и инструментов → 25 прошло. eslint по агенту и отправке → 0.
- P-тесты подфазы: живое сообщение в Telegram не отправлялось.
- Миграции: нет.
- Изменённые файлы: `telegram-bot.ts`, `telegram-agent.ts`, тест агента, ТЗ 12.3, D362.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.


## [2026-10-08] — развилка всех ходов Spoki — DONE (не выложено)

- Сделано: промпт версии 6, блок `ROUTES`. На ход один маршрут: сторона, поиск, гость, отклик, профиль, найм, цена, отказ. После помощи не больше одного вопроса или одной карточки.
- Команды проверки: vitest памяти бота → 6 прошло.
- P-тесты подфазы: живой диалог модели не гонялся.
- Миграции: нет.
- Изменённые файлы: `system.ts`, `memory.test.ts`, ТЗ 12.4, D361.
- Отклонения от ТЗ: сценарии работодателя в ТЗ были V2; карточки размещения и оплаты компании уже заданы D360 и оставлены. Просмотр кандидатов в чат не добавлялся.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.


## [2026-10-08] — Spoki подводит к оплате — DONE (не выложено)

- Сделано: промпт версии 5. Сначала помощь по вопросу, затем одна фраза и карточка подходящего тарифа. Ищущему Plus $5 или Pro $15, компании «Найм» $79 или «Команда» $199. «Старт» бесплатный. Годовую цену и ещё не включённые лимиты не обещает.
- Команды проверки: vitest памяти и инструментов бота → 21 прошло.
- P-тесты подфазы: живой ответ модели не гонялся. Локальный ключ модели в прошлой проверке не отвечал.
- Миграции: нет.
- Изменённые файлы: `system.ts`, `tools.ts`, `memory.test.ts`, ТЗ 12.4, D360.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.


## [2026-10-08] — карточка шага и голос Spoki — DONE (не выложено)

- Сделано: `offer_step` показывает карточку оплаты тарифа, тарифов, регистрации или размещения. Адрес собирает сервер. Гость на оплате уходит на вход. Промпт версии 4: короткие фразы, один шаг, без продажи, пока человек сам не спросит про охват или лимит.
- Команды проверки: `pnpm typecheck` → 0; eslint по боту и чату → 0; vitest инструментов, Telegram, памяти и сообщений → 40 прошло.
- P-тесты подфазы: живой ответ модели не гонялся.
- Миграции: нет.
- Изменённые файлы: `offers.ts`, `tools.ts`, `system.ts`, `chat.tsx`, `telegram-agent.ts`, сообщения en/ru/es/pt-BR, ТЗ 12.3, D359.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.


## [2026-10-08] — гость с «Оплатить» на вход, знаки USDC и Tether — DONE

- Сделано: на тарифах кнопка оплаты у гостя ведёт сразу на `/login?next=billing|billing-team|billing-plus|billing-pro`. Вошедший открывает кассу. Если сессия пропала во время оплаты, касса тоже уходит на вход. Знаки в кассе — публичные знаки USDC (Circle) и Tether.
- Команды проверки: `pnpm typecheck` → 0; eslint по тарифам и кассе → 0; vitest тарифов, сообщений и ошибок оплаты → 14 прошло.
- P-тесты подфазы: живой перевод не проводился.
- Миграции: нет.
- Изменённые файлы: `pricing.ts`, страница тарифов, `login-next.ts`, `token-mark.tsx`, `crypto-pay.tsx`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.


## [2026-10-08] — проверка ошибок оплаты — DONE

- Сделано: отмена в кошельке больше не пишется как «перевод не засчитан». Пока перевод проверяется, вторая оплата не стартует. Plus, Pro и «Команда» не получают письмо «Найм включён» с пустой ссылкой на вакансию. Неверная сеть и USDT на Base называются отдельно.
- Команды проверки: `pnpm typecheck` → 0; eslint по кассе и подтверждению → 0; vitest кассы и сообщений → 10 прошло. Журнал production за сутки: ошибок `/api/billing` нет. Старый 500 входа уже закрыт. Таймаут `/matches` от 5–7 октября к оплате не относится.
- P-тесты подфазы: живой перевод не проводился.
- Миграции: нет.
- Изменённые файлы: `crypto-pay.tsx`, `pay-error.ts`, подтверждение заказа, сообщения.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.


## [2026-10-08] — окно оплаты со знаками USDC и Tether — DONE

- Сделано: касса на `/billing/crypto` показывает тариф, цену и 30 дней. USDC и Tether выбираются карточками со знаками. Кнопка пишет сумму и токен. Тексты кассы доходят до клиента: пространство `billing` добавлено в набор клиентских переводов.
- Команды проверки: `pnpm typecheck` → 0; eslint по кассе и знакам → 0; `vitest run src/messages/messages.test.ts` → 9 прошло.
- P-тесты подфазы: локально `/ru/dev/pay-preview` (страница удалена, в продукт не входит) — карточки USD Coin и Tether, кнопка меняется на «Оплатить $5 USDT». Живой перевод не проводился.
- Миграции: нет.
- Изменённые файлы: `src/modules/billing/ui/crypto-pay.tsx`, `src/components/ui/token-mark.tsx`, страница оплаты, сообщения, layout.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.


## [2026-10-08] — вход после кнопки тарифа — DONE

- Сделано: проверка `next` на странице входа живёт вне клиентского модуля. Иначе `/login?next=billing-plus` падал с 500: сервер вызывал функцию из `"use client"`.
- Команды проверки: `pnpm typecheck` → 0; eslint по файлам входа → 0.
- P-тесты подфазы: гость с кнопки «Команда» на https://intgetion.com/ru/pricing?for=companies попадает на `/ru/login?next=billing-team`, форма входа на месте. Выкладка `dpl_3CKKgE4guXtB1SFSj63YWBnAmYiX` стоит на intgetion.com.
- Миграции: нет.
- Изменённые файлы: `src/components/auth/login-next.ts`, `login-form.tsx`, `login/page.tsx`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-08] — кнопки «Команда», Plus и Pro (D358) — DONE

- Сделано: «Старт» бесплатный. «Команда» ($199), Plus ($5) и Pro ($15) открывают оплату и включают тариф на 30 дней после проверки перевода. Годовая цена не списывается, автопродления нет. Сумма берётся из `plans` и должна совпасть с карточкой.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 806 прошло, 1 пропущен. `pnpm db:migrate` → applied `0039_billing_plans.sql`. Первый прогон миграции упал на RLS (`plans` с FORCE); вставка идёт при снятом force и force возвращается.
- P-тесты подфазы: на https://intgetion.com/pricing?for=companies ссылки «Найм» и «Команда» ведут на `/billing/crypto?plan=hire` и `plan=team`. На `/pricing` Plus и Pro — на `plan=plus` и `plan=pro`. «Старт» остаётся бесплатным. Живой перевод с кошелька не проводился. Лимиты и инструменты этих карточек платежом не включаются.
- Миграции: `0039_billing_plans.sql` на облаке.
- Изменённые файлы: оплата, тарифы, вход с возвратом на план, сообщения, документы.
- Отклонения от ТЗ: подписка в PAYMENTS.md — это один платёж на 30 дней, не автосписание.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.


> Older entries: [docs/archive/mission-log/](docs/archive/mission-log/) — see [docs/archive/INDEX.md](docs/archive/INDEX.md).
> Session protocol: [docs/tz/00-protocol.md](docs/tz/00-protocol.md). Status now: [docs/CURRENT.md](docs/CURRENT.md).

## [2026-10-08] — кнопка «Найм» на тарифах (D357) — DONE

- Сделано: на `/pricing` карточка «Найм» — ссылка на `/billing/crypto`. Там владелец выбирает опубликованную вакансию. «Команда», Plus и Pro остаются «Скоро».
- Команды проверки: `pnpm typecheck` → 0; eslint по страницам тарифов и оплаты → 0; `vitest run src/config/pricing.test.ts src/messages/messages.test.ts` → 12 прошло.
- P-тесты подфазы: на https://intgetion.com/pricing?for=companies кнопка «Pay with USDT or USDC» у гостя открывает `/login?next=billing`. На `/ru/pricing?for=companies` кнопка «Оплатить в USDT или USDC». Живой перевод с кошелька не проводился.
- Миграции: нет.
- Изменённые файлы: `src/app/[locale]/pricing/page.tsx`, `src/app/[locale]/billing/crypto/page.tsx`, `src/config/pricing.ts`, `src/modules/billing/service/billing-service.ts`, сообщения.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-08] — приём «Найма» на production (D356) — DONE

- Сделано: страница оплаты берёт кошелёк из браузера, без Project ID WalletConnect. На production включены `BILLING_ENABLED`, провайдер `walletconnect`, официальные контракты USDC (Circle) и USDT (Tether / USDT0) и публичные RPC. На Base контракта USDT в официальных страницах нет, там только USDC. Выкладка `dpl_8sGLZVb4mHFdim4F2GEb5zkakTyh` стоит на https://intgetion.com. Без входа `/billing/crypto` уходит на `/login`.
- Команды проверки: чтение контрактов в сети → `decimals` 6 и ожидаемый `symbol`; `pnpm typecheck` → 0; eslint по файлам оплаты → 0; `pnpm exec vitest run src/messages/messages.test.ts src/lib/billing` → 14 прошло.
- P-тесты подфазы: живой перевод с кошелька основателя в этой сессии не проводился.
- Миграции: нет новых. `0038` уже на облаке.
- Изменённые файлы: `src/modules/billing/ui/crypto-pay.tsx`, `src/app/[locale]/billing/crypto/page.tsx`, `src/messages/{en,ru,es,pt-BR}.json`, документы.
- Отклонения от ТЗ: кабинет WalletConnect не выдаёт Project ID без входа основателя. Санкционный список не подключён. RPC публичные.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-08] — выкладка pt-BR, сводок и оплаты — DONE

- Сделано: на облако применены `0035`–`0038`. На https://intgetion.com стоит выкладка `dpl_7e9vxx63wQnwuyFaEHxP6XASnd9M`: португальский (Бразилия), сводки работодателя с админкой и вступлением, и путь оплаты «Найма». Приём денег не включался: нет контрактов токенов, проекта WalletConnect и RPC. `/pt-BR` отвечает 200, `/billing/crypto` без входа уходит на `/login`.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm test` → 804 прошло, 1 пропущен; `pnpm db:migrate` → applied 0035, 0036, 0037, 0038.
- P-тесты подфазы: нет отдельного прогона в браузере. Оплата на сайте остаётся заявкой, пока флаги выключены.
- Миграции: `0035_locale_pt_br.sql`, `0036_company_agent_briefs.sql`, `0037_brief_runs_employers.sql`, `0038_billing_hire.sql` — на облаке.
- Изменённые файлы: язык pt-BR, сводки, оплата, документы статуса. Не в коммите: `.claude/` и `docs/tz/20-morning-briefs.local-draft.md`.
- Отклонения от ТЗ: номера D352, D354 и D355 в DECISIONS заняты и сводками, и оплатой. Санкционный список и блок «Продвигается» в ленте по-прежнему не сделаны.
- OPEN QUESTION: контракты USDT/USDC, проект WalletConnect и RPC основатель кладёт в окружение, не в чат. Адреса Tron и Solana не заданы.
- Следующая подфаза: только по команде. Боевое включение оплаты — после этих трёх значений.

## [2026-10-08] — оплата «Найма», статус и тариф (D354) — DONE

- Сделано: миграция `0038_billing_hire.sql`, проверка перевода, заказ WalletConnect, статус только с сервера, «Найм» на 30 дней одной транзакцией после `paid`. Без флагов страница пишет заявку и тариф не включает. Кабинет `/employer/billing` и страница вакансии показывают «Старт» или «Найм».
- Команды проверки: `pnpm exec tsc --noEmit` → 0; eslint по файлам оплаты → 0; `pnpm test` → 796 прошло, 3 упали в `auth-emails.test.ts` без `NEXT_PUBLIC_SITE_URL` (так же падает без этой переменной и до оплаты); с `NEXT_PUBLIC_SITE_URL=http://localhost:3000` эти 11 писем проходят.
- P-тесты подфазы: девять отказов проверки перевода по отдельности, недоплата и повтор не включают тариф.
- Миграции: `0038_billing_hire.sql` (на облако не выкладывалась).
- Изменённые файлы: `src/db/migrations/0038_billing_hire.sql`, `src/lib/billing/**`, `src/modules/billing/**`, `src/app/api/billing/**`, `src/app/api/cron/billing/route.ts`, `src/app/[locale]/billing/crypto/page.tsx`, `src/app/[locale]/employer/billing/page.tsx`, `src/messages/*.json`, `vercel.json`, `.env.example`, `scripts/env-rules.mjs`.
- Отклонения от ТЗ: санкционный список не подключён (проверка умеет `frozen`, сверка с OFAC — до боевого включения). Общая лента ещё не рисует блок «Продвигается» из покупки. Письмо уходит только если заданы Resend и почта владельца.
- OPEN QUESTION: адреса контрактов USDT/USDC и адрес Safe основатель кладёт в окружение, не в репозиторий.
- Следующая подфаза: боевое включение (D в ТЗ) только по команде, после миграции `0038` на облако.

## [2026-10-08] — статус оплаты и появление тарифа (D353) — DONE

- Сделано: в ТЗ оплаты статус заказа выдаёт и проверяет только сервер. Клиент его опрашивает. «Найм» (`company_hire`) появляется в кабинете и на вакансии только в статусе `paid`, одной транзакцией. До этого остаётся «Старт». Поправлены противоречия: код `company_growth` в PRICING §6.1 и общий вебхук в §6.3. Код не писался.
- Команды проверки: нет — правка документов.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/23-billing.md`, `docs/PAYMENTS.md`, `docs/PRICING.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет новых. Адреса не-EVM по-прежнему не заданы.
- Следующая подфаза: только по команде.

## [2026-10-08] — USDT и USDC на любой сети (D352) — DONE

- Сделано: в ТЗ оплаты покупатель сам выбирает USDT или USDC и сеть. Оба токена на EVM-сетях белого списка, один адрес компании. Сеть не из EVM в решение входит, но не покрывается адресом `0x`. Код не писался.
- Команды проверки: нет — правка документов.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/23-billing.md`, `docs/PAYMENTS.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: адреса получателя для Tron и Solana не заданы.
- Следующая подфаза: только по команде.

## [2026-10-08] — ТЗ оплаты WalletConnect (D351) — DONE

- Сделано: живое ТЗ `docs/tz/23-billing.md`. Первая оплата — WalletConnect, услуга «Найм» $79, один EVM-адрес компании, без ключа на сервере. Карты, Tron и тарифы кандидата вынесены из первых подфаз. Механика проверки остаётся в `docs/PAYMENTS.md`, цены — в `docs/PRICING.md`. Код не писался.
- Команды проверки: нет — документов достаточно, кода нет.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/23-billing.md`, `docs/tz/INDEX.md`, `docs/PAYMENTS.md`, `docs/DECISIONS.md`, `docs/OPEN_TASKS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: нет. V3-запрет на код оплаты сохранён до явной подфазы.
- OPEN QUESTION: первая сеть (консервативно Base); адрес Safe основатель кладёт в окружение, не в чат; юрлицо по-прежнему открыто до боевых денег.
- Следующая подфаза: только по команде. Подфаза B ТЗ — заглушка заявки, без перевода.

## [2026-10-08] — язык pt-BR (D350) — DONE

- Сделано: `src/messages/pt-BR.json` (перевод всех ключей en), `routing.ts` (`pt-BR`), `intlLocale` → `pt-BR`, каталог серверных писем, имена языка в en/ru/es. Письма: `email-html.ts`, `renderAuthEmail` берёт pt-BR из каталога; Go-шаблоны `supabase/templates/*` и темы в `config.toml` ветвятся ru/es/pt-BR/en. Бот: `linesFor` — `pt*` → pt-BR, строки входа через Telegram на pt-BR. Юридические тексты: секции `<!-- pt-BR -->` в `legal-terms.md` и `legal-privacy.md`, `pnpm legal:sync`, `legalText` отдаёт pt-BR. Миграция `0035_locale_pt_br.sql` и CHECK в `src/db/schema`. `SEO_LOCALES`, заголовок RSS, письмо проверки домена, язык в промпте агента.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 781 прошло, 2 упало в `auth-emails.test.ts` (нет `NEXT_PUBLIC_SITE_URL` в окружении, на чистом master падает так же); с `NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm test` → 783 прошло, 1 пропущен. `pnpm build` без переменной → 1 (`ERR_SWC_NATIVE_CACHE`, ACL Windows); `SWC_NATIVE_BINDING_CACHE=C:UsersAdmin.swc-cache-cursor pnpm build` → 0. В браузере `/pt-BR/jobs` и `/pt-BR/terms` на португальском, тексты вакансий на исходном языке.
- P-тесты подфазы: новые тесты — каталог pt-BR (ключи и плейсхолдеры), бот pt/pt-br и запасной английский для es, `legalText` pt-BR, письмо magic link pt-BR, шаблоны Supabase на четыре языка, hreflang и IndexNow.
- Миграции: `0035_locale_pt_br.sql` (на облако не выкладывалась).
- Изменённые файлы: `src/messages/*.json`, `src/i18n/{routing,locale,messages}.ts`, `src/lib/{email-html,auth-email-templates}.ts`, `supabase/templates/*`, `supabase/config.toml`, `src/modules/bot/service/telegram-agent.ts`, `src/modules/bot/prompts/system.ts`, `src/modules/auth/service/telegram-login.ts`, `src/modules/companies/service/verification-service.ts`, `src/modules/jobs/service/job-feed.ts`, `src/modules/seo/site.ts`, `src/db/schema/*`, `scripts/legal-sync.mjs`, `src/content/legal/*`, `docs/content/legal-*.md`, тесты.
- Отклонения от ТЗ: нет. Mini App (`tg.html`, перенаправление в `proxy.ts`) не трогал — D350.
- OPEN QUESTION: перевод юридических текстов на pt-BR — машинный уровень, нужна проверка юристом до опоры на него.
- Следующая подфаза: только по команде (de/fr/it не начинались). Миграцию `0035` выложить на облако по протоколу до выкладки кода, иначе пользователь с pt-BR упрётся в CHECK.

## [2026-10-08] — вход через X включён — DONE

- Сделано: в существующем приложении портала X включена аутентификация пользователя (OAuth 2.0, confidential, запрос почты, права Read). Callback — облачный Supabase. Провайдер X / Twitter (OAuth 2.0) включён в проекте `intgetion-dev`. Секрет в репозиторий и в лог не писался. `GET /api/auth/x` отвечает 307 на authorize, следующий шаг — `x.com/i/oauth2/authorize`.
- Команды проверки: `curl` authorize → 302 на `x.com`. lint/typecheck/test не запускались — код не менялся.
- Миграции: нет.
- Изменённые файлы: `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет. Имя приложения в портале переименовано в `INTGETION JOB LIST`.
- Следующая подфаза: только по команде.

## [2026-10-08] — канал Jobs Alert включён на проде — DONE

- Сделано: `JOBS_ALERT_CHAT_ID` записан в Vercel production проекта `intgetion-job-list` (тип sensitive, preview не задан). Бот уже админ канала. Перевыкладка текущего production `dpl_9RYxwju33cs6pPMHu32sy4b1TDNh` → `dpl_DrtiLuTMVg4qfvdvrzdZqmZwdX44`, чтобы cron увидел переменную. Само значение id в лог не пишется.
- Команды проверки: создание env через Vercel API — created, failed пустой. Выкладка `dpl_DrtiLuTMVg4qfvdvrzdZqmZwdX44` — READY, алиас intgetion.com.
- Миграции: нет ( `0033` уже на облаке).
- Изменённые файлы: `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: вход через X. Портал разработчика в браузере агента всё ещё на экране входа.

## [2026-10-08] — хвосты канала, X и писем входа — BLOCKED

- Сделано: сверка прода, без новых фич. Письма входа уже брендированные: Send Email Hook на `https://intgetion.com/api/auth/hooks/send-email` включён, `AUTH_SEND_EMAIL_HOOK_SECRET` есть в Vercel (production и preview). В логах Auth за 2026-10-07 есть `Hook ran successfully`. Вставка HTML в Dashboard не нужна, пока хук включён. Google в `/auth/v1/settings` включён, X/twitter выключен. `JOBS_ALERT_CHAT_ID` в Vercel проекта `intgetion-job-list` отсутствует.
- Команды проверки: чтение `/auth/v1/settings` и списка env Vercel (без расшифровки секретов); выборка `auth_logs` за сутки. lint/typecheck/test не запускались — код не менялся.
- Миграции: нет.
- Изменённые файлы: `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: канал — после числового chat id и прав бота писать в канал. X — после клиента OAuth 2.0 в портале разработчика (секрет в чат не присылать, только в Supabase). Язык `pt-BR` — отдельная сессия.

## [2026-10-07] — главная, адреса без /en и испанский — DONE

- Сделано: главная стала лентой вакансий, футер из трёх групп, меню зависит от типа аккаунта (D342–D344). Английский на корне, `/en` уходит на тот же путь без префикса (D345). Испанский — третий язык интерфейса (D346), миграция `0034_locale_es.sql`. Старый ежечасный digest не возвращался: утренние сводки читают каталог `es`.
- Команды проверки: typecheck и точечные vitest после сборки конфликтов.
- Миграции: `0034_locale_es.sql`. Тестовая капля Remotive не вливалась.
- Отклонения: номера D332–D336 на ветке Клода уже были заняты, здесь это D342–D346.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. Дальше по языкам — португальский.

## [2026-10-07] — утренние сводки и канал Jobs Alert на прод — DONE

- Сделано: в одну ветку собраны утренние сводки Claude (D340, слоты Чикаго / Берлин / Москва, cron `/api/cron/morning-briefs`) и канал Jobs Alert (D341). Старые ветки `origin/claude/*` не мержились: те же решения уже на master. На облако применены `0032_morning_briefs.sql` и `0033_jobs_alert.sql`. Канал молчит, пока в Vercel пустой `JOBS_ALERT_CHAT_ID`.
- Команды проверки: `vitest` jobs-alert, briefs, digest-service → 23 passed. `tsc` на чистом дереве без локального `.next` (локальный прогон упёрся в устаревший тип удалённого `/api/cron/digest` в `.next`, каталог в gitignore).
- Миграции: `0032_morning_briefs.sql`, `0033_jobs_alert.sql` — applied на облаке.
- Изменённые файлы: сводки в `src/modules/notifications/`, канал в `src/modules/jobs/service/jobs-alert.ts`, `vercel.json`.
- Отклонения от ТЗ: номер канала сдвинут на 0033 и D341, потому что 0032 и D340 заняты сводками. `app_rw` читает одну строку `schema_migrations`.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. Чтобы канал писал, бот должен быть админом канала и в Vercel нужен числовой `JOBS_ALERT_CHAT_ID`.

## [2026-10-07] — канал Jobs Alert — DONE

- Сделано: новая опубликованная вакансия уходит в канал Jobs Alert фиксированным текстом (название, компания, зарплата, ссылка) из cron `/api/cron/telegram` после личной рассылки. Без LLM. Метка `jobs_alert_sent_at` только после успешной отправки. Старые вакансии не догоняются. На intgetion.com источник Remotive не постится. Пустой chat id выключает только этот шаг. Зарплата — в валюте работодателя, иначе USD.
- Команды проверки: `vitest` jobs-alert → 12 passed (вместе со сводками — 23).
- Миграции: `src/db/migrations/0033_jobs_alert.sql`.
- Изменённые файлы: `src/modules/jobs/service/jobs-alert.ts`, cron telegram, схема jobs, тесты, `scripts/env-rules.mjs`.
- Отклонения от ТЗ: `app_rw` получает чтение одной строки `schema_migrations` (имя этой миграции), иначе водяной знак из cron не виден.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-07] — ручная привязка в Supabase — DONE

- Сделано: в облачном проекте `intgetion-dev` включён «Allow manual linking». В `supabase/config.toml` `enable_manual_linking = true`. «Привязать Google» с локального сайта открывает выбор аккаунта Google и возвращает на `/{locale}/auth/callback?next=account`. Провайдер X не включался: клиента OAuth 2.0 нет (D336).
- Команды проверки: браузер — `GET /api/auth/google?locale=ru&link=1` открыл `accounts.google.com` (приложение INTGETION JOB LIST), не `oauth_unavailable`.
- Миграции: нет.
- Изменённые файлы: `supabase/config.toml`, `docs/DECISIONS.md`, `docs/OPEN_TASKS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: нет (D339).
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде основателя. X заработает после клиента в портале разработчика.

## [2026-10-07] — привязка аккаунтов и одно согласие — DONE

- Сделано: в «Настройки → Аккаунт → Способы входа» можно привязать и отвязать Telegram, Google и X. Google и X идут через `linkIdentity` и возвращают на эту страницу. Последнюю identity отвязать нельзя. Telegram при выключенном виджете привязывается ботом, без новой сессии. На входе и регистрации текст согласия один, внизу блока: «Продолжая, вы принимаете…».
- Команды проверки: `pnpm exec tsc --noEmit` → 0. eslint по затронутым файлам → 0. `vitest` auth-service и telegram → 55 passed. Браузер на `:3000`: `/ru/login` и `/ru/register` — одна строка «Продолжая, вы принимаете…», «Продолжая через» нет. `/ru/settings/account` — Telegram «Привязать», Google «Отвязать» (уже привязан), X ссылка `/api/auth/x?locale=ru&link=1`.
- Миграции: нет.
- Изменённые файлы: `src/components/settings/sign-in-methods.tsx`, `src/app/[locale]/settings/account/page.tsx`, `src/components/auth/social-sign-in-stubs.tsx`, `src/components/auth/telegram-login-button.tsx`, `src/modules/auth/service/auth-service.ts`, `telegram-login.ts`, маршруты `oauth/unlink` и `telegram/link`, callback, `src/messages/{en,ru}.json`.
- Отклонения от ТЗ: привязка OAuth поверх D7 (OAuth был V2) — D339, в том же духе, что D335 и D336.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде основателя.

## [2026-10-07] — сборка и выкладка — DONE

- Сделано: локальные наработки собраны с `origin/master` и выложены на https://intgetion.com. В проде: Google и X на входе, кнопка Telegram, растущее поле чата, тип аккаунта, письма D330, плюс уже бывшие на master логотип, цены и D325–D329. X-провайдер в Supabase по-прежнему выключен.
- Команды проверки: `pnpm exec tsc --noEmit` → 0. `vitest` auth-service, schemas, email-html → 48 passed. Прод `d914274` READY. `https://intgetion.com/ru/login` содержит `/api/auth/google`, `/api/auth/x`, Telegram и `/pricing`.
- Миграции: `0031_account_type.sql` уже была на облаке до этой выкладки.
- Изменённые файлы: ветка `feat/email-system-design`, merge в master, PR #12.
- Отклонения от ТЗ: запись про Spoki перенумерована в D337, потому что D324 на master — Mini App.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде основателя. X заработает после клиента в портале разработчика.

## [2026-10-07] — Spoki composer like a chat — DONE
- Сделано: поле снизу чата. Пустое — одна строка 44 px. Две и три строки выше, низ поля на месте. С шести строк высота 160 px и дальше не растёт: длинный текст скроллится внутри. Лента скроллится отдельно, страница не растёт. Enter отправляет и возвращает поле к одной строке, фокус остаётся. Shift+Enter переносит строку. Клавиатура по-прежнему сжимает страницу (D287).
- Команды проверки: eslint → 0. Chrome на `:3000`, 1280×800 и 390×700: пусто 44, одна 44, две 60, три 80, длинный текст 160 при scrollHeight 840, низ поля не сдвинулся, высота ленты та же. После Enter поле 44, пустое, в фокусе. Установленное PWA не ставилось: та же страница.
- Миграции: нет.
- Изменённые файлы: `src/components/bot/chat.tsx`, `tests/e2e/chat.spec.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: D334 отменяет D333.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде.

## [2026-10-07] — Spoki composer fixed — DONE
- Сделано: поле чата снова всегда 44 px. Рост по `scrollHeight` убран. Длинный текст и Shift+Enter прокручиваются внутри. Enter отправляет. Общий textarea форм не трогался.
- Команды проверки: eslint → 0. Chrome на `:3000`, 1280 и 390: 1 символ, 1 строка, 10 и 100 строк — высота 44 px, `min`/`max` тоже 44, `overflow-y: auto`, `scrollHeight` 2040 при видимых 42. Лента не меняла высоту. Enter очистил поле, высота осталась 44. Установленное PWA не ставилось: это та же страница.
- Миграции: нет.
- Изменённые файлы: `src/components/bot/chat.tsx`, `src/components/ui/input.tsx`, `tests/e2e/chat.spec.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: D333 отменяет рост из D332.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде.

## [2026-10-07] — Spoki composer cap — DONE
- Сделано: поле чата растёт от 44 px до `min(7.5rem, 30dvh)`, дальше высота стоит, текст прокручивается внутри. Низ поля не сдвигается. Enter отправляет, Shift+Enter переносит строку. Общий textarea форм не изменил высоту.
- Команды проверки: eslint → 0. Chrome на `:3000`: 1280 и 390 — одна строка 44 px, три строки 80 px, длинный текст 120 px при `scrollHeight` больше поля, `overflow-y: auto`, ширина ленты та же. Enter отправил 8 строк и вернул поле к 44 px.
- Миграции: нет.
- Изменённые файлы: `src/components/ui/input.tsx`, `src/components/bot/chat.tsx`, `tests/e2e/chat.spec.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: D332 уточняет D331.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде.

## [2026-10-07] — Spoki chat layout — DONE
- Сделано: `/chat` — колонка на весь экран, лента сама скроллится, поле одной строки 44 px. Длинный текст прокручивается внутри, ручки растягивания нет. Кнопка отправки — иконка внутри поля. Карточки вакансий и разовые кнопки аккаунта остались над полем. Подвал на этой странице скрыт.
- Команды проверки: `pnpm exec eslint` по `chat.tsx` и странице чата → 0. Playwright Chromium в среде не установлен. Замер через установленный Chrome на `http://127.0.0.1:3000/en/chat`: 1280×800 и 390×800, высота поля 44 px до и после длинной вставки, `resize: none`, заголовок Spoki Assistant виден, лента выше поля, поле у нижнего края.
- P-тесты подфазы: `tests/e2e/chat.spec.ts` — сценарий высоты поля добавлен, локально не прогнан (нет браузера Playwright).
- Миграции: нет.
- Изменённые файлы: `src/components/bot/chat.tsx`, `src/app/[locale]/chat/page.tsx`, `src/app/globals.css`, `tests/e2e/chat.spec.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: D331. Общий textarea форм не менялся.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде.

## [2026-10-07] — Spoki memory — DONE
- Сделано: веб-чат ведёт Spoki Assistant. Ответ вроде «В Италии» пишется в `bot_conversations.state.draft.country` (`IT`) на любом LLM, известные поля не переспрашиваются, пустой ответ модели заменяется следующим вопросом. Гость после страны или роли видит одну кнопку «Создать аккаунт»; регистрация с `next=chat` возвращает в тот же диалог. «Пусть Spoki заполнит» пишет allowlist профиля без карточки на каждое поле; отклик по-прежнему с карточкой. В шапке одна кнопка «Войти» на всех ширинах; magic link — ссылка под формой. Отдельного PWA-входа нет.
- Команды проверки: `pnpm exec tsc --noEmit` → 0. `pnpm exec eslint` по затронутым файлам → 0. `pnpm exec vitest run` на memory/extract/tools/auth-service/llm/messages → 72 passed. `pnpm exec vitest run --config vitest.integration.config.mts src/modules/bot/bot.integration.test.ts` → не запущен против БД: `DATABASE_URL` в этой среде не loopback, тест сам отказался. Браузерный инструмент недоступен. HTML уже запущенного `next dev` на `:3000`: `/en/chat` отдаёт заголовок Spoki Assistant и пустую фразу без чипов; `/en/login` — одна кнопка входа, ссылка Email link, «No account? Register», без легенды способа входа и без кнопок Google/X/Telegram. Узкое окно и установленное PWA не открывались: это тот же HTML, кнопка «Войти» в шапке скрыта ниже `sm` и остаётся в меню.
- P-тесты подфазы: `src/modules/bot/__tests__/memory.test.ts` (Италия, длинная реплика, промпт). Интеграционный сценарий добавлен в `bot.integration.test.ts`, локально не прогнан.
- Миграции: нет.
- Изменённые файлы: `src/modules/bot/**`, `src/components/bot/chat.tsx`, `src/components/auth/login-form.tsx`, `src/components/auth/register-form.tsx`, `src/components/shell/header.tsx`, `src/app/api/bot/fill/route.ts`, `src/app/api/bot/conversation/route.ts`, `src/app/[locale]/login/page.tsx`, `src/app/[locale]/register/page.tsx`, `src/app/[locale]/auth/callback/route.ts`, `src/modules/auth/**`, `src/lib/llm/provider.ts`, `src/messages/{en,ru}.json`, `tests/e2e/{auth,chat}.spec.ts`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`.
- Отклонения от ТЗ: D324. Страна не становится жёстким фильтром поиска, если в черновике удалёнка. Лимиты D323 не менялись.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде. Телефонный Mini App не трогался.

## [2026-10-05] — P-MOBILE — на ветке cursor/p-mobile

- Сделано: e2e на 360 и 390 для главной, каталога, вакансии, зарплат, входа и чата (без горизонтальной прокрутки, зоны нажатия кнопок и полей ≥ 44 px, axe без critical и serious). Нижнее меню кандидата проверено на 360. Чат на телефоне занимает экран между шапкой и меню, поле ввода не уезжает под клавиатуру (`interactive-widget: resizes-content`). В `scripts/ci-ui.sh` мобильный Lighthouse каталога и вакансии, медиана пяти прогонов, потолок 4000 мс (D288). «Не указано» в телеметрии красится `--fg-muted` (D286): `#71717A` на чёрном — 4.35:1.
- Команды проверки: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37372773588 — `check` и `database` success, head `665c0a9`. Lighthouse: главная медиана 1898 мс (2650, 1898, 1874, 1876, 1916); каталог 2749 мс; вакансия 1868 мс. Потолок каталога и вакансии снижен до 4000 мс. Ранние прогоны: `37363382897` контраст, `37365038039` радиокнопки, `37365887816` Chrome и отмены раннера.
- P-тесты подфазы: phone.spec.ts, правка mobile-app.spec.ts.
- Миграции: нет.
- Изменённые файлы: `src/components/bot/chat.tsx`, `src/app/[locale]/chat/page.tsx`, `src/app/[locale]/chat/layout.tsx`, `src/app/globals.css`, `tests/e2e/phone.spec.ts`, `tests/e2e/mobile-app.spec.ts`, `scripts/ci-ui.sh`, `docs/DECISIONS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: D285–D288. `scripts/ci-ui.sh` обычно меняет только Claude Code; правка здесь, потому что задание прямо кладёт туда замер.
- OPEN QUESTION: нет. Потолок 4000 мс держит измеренные медианы с запасом на медленный раннер.
- Следующая подфаза: Claude Code вливает после зелёного CI. В master не вливалось.

## [2026-10-06] — P-MOBILE Cursor влит в пачку — на ветке claude/integrate-seo2

- Сделано: пять коммитов `cursor/p-mobile` перенесены на `08b8456` (D285–D288): телефонные проверки в e2e (`tests/e2e/phone.spec.ts`), чат на телефоне на весь экран, зона нажатия 44 px у выбора способа входа, приглушённый цвет для отсутствующей телеметрии, мобильный Lighthouse каталога и вакансии с потолком 4000 мс и повтор прогона, когда Chrome не успевает поднять порт отладки.
- Повтор Lighthouse закрывает ту самую флаку, из-за которой у нас сегодня краснели `claude/organic` и D302: «waiting for dynamic debugging port».
- Конфликты: только `MISSION_LOG.md` и `docs/DECISIONS.md` (append-only), обе стороны сохранены. Решения Cursor D285–D288 легли в конец файла — он ведётся в порядке вливания, а не по номерам.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 659 passed. Паритет `en.json` / `ru.json` — 1223 ключа с обеих сторон. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D285–D288 (Cursor).
- Следующее: зелёный CI → ff master, затем `cursor/admin-a2` с миграцией 0029.

## [2026-10-05] — A2 — на ветке cursor/admin-a2

- Сделано: списки и карточки людей, компаний и вакансий. Почта, телефон и Telegram на карточке в маске; «Показать» только с правом `users.pii.read` и причиной, в аудит пишется `pii.read`. Приостановка, завершение сессий и сброс пароля — сразу. Бан и удаление — запрос на 24 часа, подтверждает второй администратор; свой запрос отвечает 422 `FOUR_EYES`. Заметки только добавляются. Бан пишет хэш почты и Telegram id в `blocklist` и ставит статус `banned`; вход уже отклоняет любой статус кроме `active`.
- Команды проверки: `pnpm exec tsc --noEmit` → 0. eslint по файлам A2 → 0. `pnpm exec vitest run src/modules/admin-console/service/people-service.test.ts src/messages/messages.test.ts` → 0 (2 файла, 5 тестов). `gh run watch 37377974818` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37377974818 — jobs `check` и `database` success, head `bf7028c`. Миграция на облако не применялась.
- P-тесты подфазы: e2e каждого действия, отказа без права, строк аудита, входа забаненного и запрета подтвердить свой запрос.
- Миграции: `src/db/migrations/0029_admin_people.sql` (в репозитории, не на облаке).
- Изменённые файлы: миграция 0029, `src/db/schema/admin-people.ts`, `src/db/schema/enums.ts`, `src/modules/admin-console/people-repo.ts`, `src/modules/admin-console/service/people-service.ts`, маршруты `api/admin/users/[id]/*` и `api/admin/approvals/[id]`, страницы users/companies/jobs, `src/admin/registry.ts`, `src/components/admin/people-actions.tsx`, `src/lib/supabase/admin.ts`, сообщения en/ru, `tests/e2e/admin-a2.spec.ts`, `docs/DECISIONS.md`.
- Отклонения от ТЗ: D304–D310 (номера перенумерованы при вливании: D293–D299 уже заняты). Карточки компании и вакансии только для чтения (D310).
- OPEN QUESTION: повторная регистрация после удаления. `registrationBlocked` уже есть, но `src/modules/auth/**` в этой задаче менять нельзя. Нужны два вызова, их добавит Claude в том же слиянии: в `register()` до `signUp` / `signInWithOtp` — если `registrationBlocked({ email })`, вернуть тот же ответ, что и при существующей почте; в `signInWithTelegramProfile`, когда привязки ещё нет, до `createConfirmedAuthUser` — если `registrationBlocked({ telegramId: String(telegram.id) })`, бросить `telegramFailed()`. Бан и приостановка существующего аккаунта вход уже закрывают без этих правок. Рекомендация: влить оба вызова вместе с A2, не откладывать.
- Следующая подфаза: Claude Code вливает после зелёного CI. В master не вливалось.

## [2026-10-06] — A2 Cursor влит в пачку — на ветке claude/integrate-seo2

- Сделано: два коммита `cursor/admin-a2` перенесены поверх P-MOBILE. Списки и карточки людей, компаний и вакансий в админке, контакты в маске до указания причины, бан и удаление в четыре глаза, заметки только на добавление, блок-лист против повторной регистрации.
- Перенумерация: Cursor занял D293–D299, но эти номера уже заняты моими решениями (отчёт «откуда приходят», подборки, FAQ, картинки, подтверждение сайта, тексты). Его решения перенумерованы в D304–D310 — в `docs/DECISIONS.md`, в заголовке миграции `0029_admin_people.sql`, в комментариях `src/db/schema/admin-people.ts` и `src/modules/admin-console/service/people-service.ts` и в его записи журнала.
- Миграции: `0029_admin_people.sql` применена к облачной базе ДО вливания: `pnpm db:migrate` → applied, `pnpm db:verify` → `app_rw exists; RLS deny-all holds on 51 tables; audit_logs is append-only`.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests scripts` → 0, `pnpm exec vitest run` → 663 passed. Паритет `en.json` / `ru.json` — 1255 ключей с обеих сторон. Предупреждения prettier по файлам Cursor — только переводы строк: те же файлы с LF проходят `--check` чисто, в его CI `format:check` был зелёный.
- Решения: D304–D310 (Cursor, перенумерованы).
- Следующее: зелёный CI → ff master, затем разбор веток Hermes.

## [2026-10-06] — агент в Telegram-боте и дизайн вкладки агента — на ветке claude/tg-agent

- Сделано: D311 — бот отвечает агентом на обычные сообщения. Вебхук сначала пробует шаг входа (`handleTelegramWebhook` теперь возвращает, взял ли он обновление), остальное идёт в `handleTelegramAgentUpdate` (`src/modules/bot/service/telegram-agent.ts`). Нить разговора выводится из id чата через HMAC с `PRIVACY_HASH_SECRET` — ни таблицы, ни миграции. Команды `/help` и `/reset`, индикатор «печатает», ответы на языке Telegram-аккаунта, вакансии ссылками на наши страницы, запрос подтверждения на запись уводит на сайт. Гость без привязки тоже может спрашивать, лимит считается по `tg:<chat>`.
- Сделано: D312 — вкладка агента переписана. Починен настоящий баг: токены стрима добавлялись отдельными сообщениями, ответ рассыпался на десятки кусков с подписью «Агент» у каждого; теперь дописываются в один ответ. Пустой экран получил три примера вопросов кнопками, появился индикатор «Думает…», вопрос справа в рамке, ответ слева без рамки, у карточки вакансии процент совпадения и до трёх строк объяснения; на телефоне подпись кнопки отправки прячется.
- Проверка в браузере (dev, порт 3400): пустой экран с примерами, отправка вопроса, подставной SSE-ответ собрался в один пузырь, карточки вакансий с «82% MATCH» на месте; телефон 375×812 — чат на весь экран, примеры в столбик. Живой агент не отвечает: `ANTHROPIC_API_KEY` нет ни локально, ни на проде — прод отдаёт `BOT_UNAVAILABLE`.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src` → 0, `pnpm exec vitest run` → 670 passed (7 новых тестов на бота), `pnpm build` → 0. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D311, D312. RUNBOOK: раздел 14 — что нужно, чтобы агент заговорил, и как прикрепить сайт к боту через BotFather.
- OPEN QUESTION: вход через Telegram возвращать не пришлось — он работает на проде, `/api/auth/telegram/start` отдаёт ссылку `t.me/intgetion_bot?start=login_…`. Старый виджет под флагом `TELEGRAM_LOGIN_ENABLED` остаётся выключенным: новый вход через бота его заменил.
- Следующее: зелёный CI → ff master. Основателю: `ANTHROPIC_API_KEY` и `LLM_PRICES_MICRO_USD` в Vercel, иначе агент молчит везде.

## [2026-10-06] — вебхук Telegram не доходил до маршрута — DONE на ветке claude/webhook-origin

- Найдено при проверке прода после вливания агента: `POST https://intgetion.com/api/telegram/webhook` отвечал `403 {"error":{"code":"FORBIDDEN","message":"Cross-origin request"}}`. Причина — проверка CSRF в `src/proxy.ts`: она отклоняет любой изменяющий запрос без `Origin`, а Telegram его не шлёт. Бот не работал вообще: ни подтверждение входа (D256–D258), ни новый агент (D311).
- Сделано: D313. `needsOriginCheck` в `src/lib/origin.ts` выводит ровно один путь `/api/telegram/webhook` из-под правила; маршрут по-прежнему проверяет `x-telegram-bot-api-secret-token` и без токена бота отвечает 404.
- Проверка локально (dev, порт 3400): вебхук без `Origin` → 404 (нет токена в `.env.local`), то есть дошёл до маршрута; `POST /api/bot/message` без `Origin` → 403, как и было.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 672 passed (2 новых теста на список исключений). Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Новый e2e в `tests/e2e/chat.spec.ts`: вебхук без `Origin` не должен отвечать 403, а обычный API без `Origin` — должен.
- Миграции: нет. Решения: D313.
- OPEN QUESTION: после вливания основателю стоит проверить вход через Telegram вживую — до этой правки он не мог сработать ни разу.

## [2026-10-06] — сессия: проверка и закрытие куки от скриптов — на ветке claude/session-keep

- Проверено по коду: куки Supabase живут 400 дней (умолчание библиотеки), прокси обновляет истёкший токен перед отрисовкой (`getClaims` → `getSession` → `_callRefreshToken`), куки разговора с агентом — 30 дней, `HttpOnly`, `SameSite=Lax`. То есть сессия и так сохранялась.
- Найдено попутно: Supabase пишет куки сессии с `httpOnly: false` — их может прочитать любой скрипт на странице. Браузерного клиента Supabase в проекте нет вообще (все вызовы серверные), поэтому куки закрыты: `authCookieOptions` в `src/lib/supabase/cookie-options.ts`, применён и в серверном клиенте, и в обновлении сессии в прокси. Решение D314.
- Новые e2e: после входа у каждой куки `sb-*` проверяются срок (не куки на время окна), `HttpOnly` и `SameSite`; затем вход переживает перезагрузку, переход на другую страницу, вторую вкладку и новый контекст браузера с теми же куками. Отдельно — что разговор гостя с агентом возвращается после перезагрузки.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 674 passed (2 новых теста на правила куки). Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D314.
- OPEN QUESTION: срок жизни refresh-токена и «выход при бездействии» задаются в панели Supabase, а не в коде. Если основателя выкидывало, стоит посмотреть там; в коде ограничений нет.
- Следующее: зелёный CI → ff master. Новые e2e и есть настоящая проверка: они выполняют вход по-настоящему.

## [2026-10-06] — сессия в окне Mini App — на ветке claude/session-frame

- Проверено по данным облачной базы: `auth.sessions` — одна живая сессия от 2026-10-05, `not_after` пустой (ограничения по времени нет), `auth.refresh_tokens` — один токен, не отозван. То есть сервер сессии не убивает, и выхода «сам по себе» на сайте нет.
- Найдено единственное место, где выход при перезаходе реален: Mini App на Telegram Web — это сайт в чужом фрейме, а куку `SameSite=Lax` браузер там не сохраняет вовсе. С включённым Mini App человек выглядел бы вышедшим при каждом открытии.
- Сделано: D315. Во фрейме сессия пишется как `SameSite=None; Secure; Partitioned`; без https послабление не включается. «Во фрейме» определяется по `Sec-Fetch-Dest: iframe` или по метке `tg_frame`, которую ставит маршрут входа в Mini App. Обычный сайт остаётся на `Lax`.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 678 passed (4 новых теста), `pnpm build` → 0. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D315.
- OPEN QUESTION: вживую это проверяется только внутри Telegram Web после включения `TELEGRAM_MINI_APP_ENABLED` и настройки кнопки меню в BotFather. Локально сценарий не воспроизвести: `SameSite=None` требует https.
- Следующее: зелёный CI → ff master.

## [2026-10-06] — переход из Mini App в своё приложение — на ветке claude/session-frame

- Сделано: D316. Маршрут `/api/auth/handoff` отдаёт вошедшему одноразовый адрес входа в его же аккаунт (магическая ссылка Supabase, без новой таблицы и миграции), а полоса `MiniAppBar` во фрейме предлагает «Открыть в браузере» и «Привязать почту». Так человек заходит через Mini App, переходит в свой браузер уже с аккаунтом, ставит PWA и там привязывает почту.
- Исправлено по ходу: первая версия полосы жила внутри `TelegramMiniApp`, а тот рендерится только для невошедших — полоса исчезала бы сразу после входа. Теперь это отдельный компонент, и он показывается только когда человек вошёл и находится во фрейме.
- Проверка локально: запрос с `Sec-Fetch-Dest: iframe` отдаёт полосу (`<aside class="border-t border-line bg-surface …">`), обычный запрос — нет. Настоящий iframe с чужого адреса не открывается вовсе: CSP разрешает только `https://web.telegram.org` и `https://*.telegram.org` — то есть встроить сайт может лишь Telegram.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 681 passed (3 новых теста на передачу сессии), `pnpm build` → 0, `prettier --check` по изменённым — чисто. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D315, D316.
- OPEN QUESTION: вживую проверяется только после включения `TELEGRAM_MINI_APP_ENABLED` и настройки кнопки меню в BotFather. Привязка почты уже существует (D230-D231) — полоса просто ведёт туда.
- Следующее: зелёный CI → ff master.

## [2026-10-06] — агент переведён на бесплатные модели OpenRouter — на ветке claude/openrouter-default

- Исправлено расхождение с договорённостью: провайдер по умолчанию был Anthropic, поэтому без платного ключа агент молчал. Теперь умолчание — OpenRouter, `LLM_PROVIDER=anthropic` остаётся запасным. Решение D317.
- Найден нерабочий дефолт: модель `qwen/qwen3.8-27b:free` в каталоге OpenRouter не существует. Запрос к `https://openrouter.ai/api/v1/models` (2026-10-06): 465 моделей, 16 бесплатных, 15 из них принимают инструменты. Новые умолчания выбраны оттуда: чат `nvidia/nemotron-3-super-120b-a12b:free` (262k контекста, tools + structured outputs), извлечение `google/gemma-4-26b-a4b-it:free`. Обе с нулевой ценой.
- Env: `OPENROUTER_API_KEY` стал обязательным для прода вместо `ANTHROPIC_API_KEY`, добавлена проверка формата ключа (`sk-or-…`). `.env.example` переписан: цены и модели можно не задавать вовсе.
- Документация приведена в соответствие: RUNBOOK (таблица переменных, ротация ключей, предзапусковый чек-лист, раздел 14), бриф Cursor.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src scripts` → 0, `pnpm exec vitest run` → 682 passed (тесты выбора провайдера и env-правил переписаны под новую договорённость), `pnpm build` → 0. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D317.
- OPEN QUESTION: у бесплатного уровня OpenRouter свои ограничения по частоте запросов. Если при живом ключе агент начнёт отвечать «попробуйте позже», причина скорее там; тогда вариант — платная модель подешевле с ценой в `LLM_PRICES_MICRO_USD`.
- Следующее: зелёный CI → ff master. Основателю: `OPENROUTER_API_KEY` в Vercel (prod), больше ничего не нужно.

## [2026-10-06] — Mini App вживую — NOT DONE (ветка `cursor/mini-app-live`)

- Сделано: D318. Кнопка «Открыть в браузере» больше не вызывает `window.open` после `await`: на компьютере окно резервируется в нажатии и только потом получает одноразовый адрес. В телефонном webview и в приложениях Telegram окно не открывается (ссылка сгорела бы внутри Telegram); если клиент отдал `Telegram.WebApp.openLink`, адрес уходит туда, иначе он показывается текстом и копируется. Чужой адрес, не наш `/auth/callback`, отбрасывается. Полоса остаётся в потоке страницы и на узком экране получает отступ `safe-area`, кнопки столбиком на всю ширину. В полосе одна строка, как поставить приложение на домашний экран. Подписанные данные по-прежнему берутся из фрагмента; если фрагмент уже стёрт, берётся копия с объекта клиента. Скрипт telegram.org не подключается.
- Живой прод, отдельно от кода: `curl -sI https://intgetion.com/en` → HTTP 200, `Content-Security-Policy` содержит `frame-ancestors 'none'`, есть `X-Frame-Options: DENY`. В Vercel-проекте `intgetion-job-list` ключа `TELEGRAM_MINI_APP_ENABLED` нет. Без него Telegram получает пустой фрейм. Telegram Web на компьютере открылся на экране входа по QR, сессии Telegram в этом браузере нет. Шаги 1–5 брифа (вход в Mini App, повторное открытие, полоса, телефон, PWA, почта, агент в боте) не выполнялись.
- Команды проверки: `pnpm exec eslint src tests scripts` → 0. `pnpm exec vitest run` → 689 passed, 1 skipped, 1 failed: `src/content/legal/legal.test.ts` — тот же артефакт CRLF рабочей копии Windows, файл не менялся. Новые тесты `src/components/auth/mini-app-open.test.ts` — 8 passed. Первый `pnpm build` → 1 из-за чужого устаревшего `.next/dev/types/validator.ts` (старые пути `src/app/[locale]/admin`, админка уже в `src/app/(admin)`); каталог `.next/dev` удалён, повтор `SWC_NATIVE_BINDING_CACHE=C:\Users\Admin\.swc-cache-cursor pnpm build` → 0, шаг TypeScript внутри сборки прошёл. `pnpm exec prettier --write` по своим файлам → 0.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/components/auth/mini-app-bar.tsx`, `src/components/auth/mini-app-open.ts`, `src/components/auth/mini-app-open.test.ts`, `src/components/auth/telegram-mini-app.tsx`, `src/messages/en.json`, `src/messages/ru.json`, `docs/DECISIONS.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: D318
- OPEN QUESTION: основателю включить `TELEGRAM_MINI_APP_ENABLED=true` в Vercel (production, проект `intgetion-job-list`) и передеплоить. Кнопка меню в BotFather по брифу уже настроена. Рекомендация: включить флаг и влить эту ветку, затем пройти шаги 1–5 на живом проде. Пока флага нет, писать «должно работать» нельзя. `ANTHROPIC_API_KEY` по-прежнему нет — ответ бота «агент недоступен» на этом шаге не поломка.
- Следующая подфаза: после флага и вливания — живая проверка Mini App. В master эта ветка не вливалась.

## [2026-10-06] — корень admin.intgetion.com — DONE

- Сделано: D319. `https://admin.intgetion.com/` отвечал 404, вход при этом открыт на `/en/admin/login`. Корень админ-хоста теперь 307 на этот вход. `/en` и `/en/jobs` на админ-хосте по-прежнему 404.
- Команды проверки: `pnpm exec vitest run src/admin/host.test.ts` → 0 (6 tests). Живой прод до выкладки: `curl -sI https://admin.intgetion.com/` → 404; `curl -sI https://admin.intgetion.com/en/admin/login` → 200.
- Миграции: нет. Решения: D319.

## [2026-10-06] — телефонный Mini App — на ветке cursor/mini-app-phone

- Сделано: D320. На компьютере Mini App — фрейм, сессия `Partitioned` сохраняется, человек сразу в кабинете. На телефоне то же окно — верхний документ webview, и эти куки не сохраняются, поэтому тот же аккаунт остаётся гостем. Вход теперь пишет обычную `SameSite=Lax` сессию, если страница не во фрейме. Метка визита на телефоне — `tg_app`, не `tg_frame`: иначе следующий запрос снова включил бы Partitioned. Полоса внизу показывается и по этой метке.
- Команды проверки: `pnpm exec vitest run src/components/auth/mini-app-open.test.ts src/lib/security.test.ts` → 0 (2 файла, 31 тест). eslint по этим файлам → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D320.
- OPEN QUESTION: нет. Живой телефон можно проверить только после выкладки этой ветки.

## [2026-10-06] — телефонный Mini App, вторая правка — на ветке cursor/mini-app-phone

- Сделано: D321. После D320 Desktop заходил, телефон — нет. Парсер фрагмента теперь как у Telegram (`#/путь?tgWebAppData=…`). `Partitioned` только для `web.telegram.org`; сервер больше не включает их по умолчанию. Вход несколько раз перечитывает данные в первые ~2 с.
- Команды проверки: `pnpm exec vitest run src/components/auth/mini-app-open.test.ts src/lib/security.test.ts` → 0 (2 файла, 31 тест). eslint → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D321.
- OPEN QUESTION: нет.

## [2026-10-06] — телефонный Mini App, третья правка — D322

- Сделано: корень `/` при Mini App больше не делает HTTP 307 на `/en` — отдаёт HTML с `location.replace`, чтобы `#tgWebAppData` не пропал на телефоне. Фрагмент дублируется в `sessionStorage`. Запасной URL `/tg.html` для BotFather. Маркер сессии пишется через `cookies().set`, чтобы не затереть куки Supabase.
- Команды проверки: `pnpm exec vitest run src/components/auth/mini-app-open.test.ts src/lib/security.test.ts` → 0 (2 файла, 31 тест). eslint → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D322.
- OPEN QUESTION: в BotFather лучше `https://intgetion.com/tg.html` или `/en`, не голый домен. Рекомендация: `tg.html`.


## [2026-10-07] — docs-reorg — DONE

- Сделано: короткий контекст для агентов. Горячий путь: `docs/README.md` → `docs/CURRENT.md` → `docs/OPEN_TASKS.md` → один `docs/tz/<domain>.md`. Монолит ТЗ заморожен в `docs/archive/tz/TZ_INTGETION_v6.md`, stub в `docs/TZ_INTGETION_v6.md`. Нарезаны domain TZ, `how-it-works/`, `status/`, `archive/INDEX`. `MISSION_LOG`: хвост 15 записей в корне, старше → `docs/archive/mission-log/2026-10-early.md`. `DECISIONS`: D1–D30 + оглавление + хвост D301+; диапазоны D31–D300 в `docs/archive/decisions/`. Обновлены `.cursor/rules/spec.mdc` и `AGENTS.md`.
- Команды проверки: `node scripts/docs-reorg.mjs` → 0 (нарезка/архив). Ручная сверка: есть `docs/tz/INDEX.md`, `docs/CURRENT.md`, `docs/archive/INDEX.md`.
- P-тесты подфазы: нет (только docs).
- Миграции: нет.
- Изменённые файлы: `docs/README.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `docs/TZ_INTGETION_v6.md` (stub), `docs/tz/*`, `docs/how-it-works/*`, `docs/status/INDEX.md`, `docs/archive/**`, `docs/DECISIONS.md`, `MISSION_LOG.md`, `.cursor/rules/spec.mdc`, `AGENTS.md`, `scripts/docs-reorg.mjs`.
- Отклонения от ТЗ: источник правды для работы — `docs/tz/` + `CURRENT`, не монолит (монолит = archive).
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде основателя (кандидат: phone Mini App из OPEN_TASKS).

## [2026-10-07] — agents-md-canon — DONE

- Сделано: корневой `AGENTS.md` — канон (~60 строк): продукт, hot path, команды `pnpm`, hard rules, карта docs. Next.js-блок сдвинут вниз. `CLAUDE.md` = `@AGENTS.md`. `.cursor/rules/spec.mdc` — тонкий указатель. `docs/README.md` и `CURRENT.md` обновлены.
- Команды проверки: ручная сверка файлов; docs-only.
- P-тесты: нет.
- Миграции: нет.
- Изменённые файлы: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/spec.mdc`, `docs/README.md`, `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения: нет (выравнивание с agents.md / индустрией).
- OPEN QUESTION: нет.
- Следующая подфаза: по команде основателя.

## [2026-10-07] — email-system-design (ветка `feat/email-system-design`, без merge) — PARTIAL

- Сделано: единый email-макет (D330); брендированные Supabase-шаблоны confirmation/recovery/magic_link (ru/en) + подключение в `supabase/config.toml`; карточки вакансий в письме `matches.digest`; русские формы плюрализации в шаблонах уведомлений; страница настроек уведомлений — строки по событиям со свитчами по каналам + блок «письма об аккаунте приходят всегда»; auth-страницы: заголовок h2 вместо display, перенос длинных строк, страница «Проверьте почту» с подсказкой и ссылкой ко входу; dev-превью писем `/dev-emails/index.html` (в production 404).
- Команды проверки: `pnpm test` → 720 passed, 1 failed (`legal.test.ts`, legal sync — не наш файл, вероятно docs-reorg); `pnpm typecheck` → ok по нашим файлам (ошибки `register-form.tsx` были от параллельного агента и потом ушли); `pnpm lint` → 1 warning в неотслеживаемом `scripts/docs-reorg.mjs` (не наш).
- Ручная проверка: превью писем на 375 px и десктопе (без горизонтального скролла, длинные названия/компании переносятся), живые вакансии из dev-БД → «View job» открывает ту же вакансию; поток «Забыли пароль» → `/ru/auth/check-email`.
- Миграции: нет.
- Отклонения: в рабочем дереве одновременно работал другой агент (Spoki/бот/регистрация); по решению основателя продолжили в общем дереве — диффы перемешаны в `en/ru.json`, login/register pages.
- OPEN QUESTION: тема письма Supabase как Go-шаблон (см. D330). Шаблоны в облачный Supabase не загружены — нужен Dashboard.
- Следующая подфаза: по команде основателя (проверка → merge отдельно).

## [2026-10-07] — account-type D331 (ветка `feat/email-system-design`, без merge) — PARTIAL

- Сделано: выбор «Я ищу работу / Я работодатель» в регистрации; `users.account_type` (миграция 0031); запись из метаданных при подтверждении; работодатель после регистрации → `/employer/company`; `accountType` в `/api/me`; смена типа в настройках аккаунта.
- Команды проверки: `pnpm test` → 721 passed, 1 failed (`legal.test.ts`, не наш); `pnpm typecheck` → 0 ошибок; `pnpm lint` → 1 warning в чужом `scripts/docs-reorg.mjs`.
- Ручная проверка: форма на 375 px, без выбора типа — «Выберите, кто вы.»
- Миграции: `0031_account_type.sql` — НЕ применена к облачной БД. Пока не применена, локальный сервер (он смотрит в облачную БД) упадёт на чтении `users`.
- OPEN QUESTION: нет.
- Следующая подфаза: по команде основателя.
- Дополнение D331: в шапке аккаунт-работодатель видит «Вакансии · Мои вакансии · Компания · Spoki», без «Отклики / Сохранённые / Профиль» (`src/components/shell/header.tsx`, `nav.myJobs`, `nav.company`).

## [2026-10-07] — главная без счётчиков — DONE (локально, без коммита)

- Сделано: убран блок «Опубликованные вакансии / Компании» с главной (`HomeStats` в `src/app/[locale]/page.tsx`), ключи `home.statJobs`, `home.statCompanies`. Сервис `countPublicCatalog` оставлен (не удалял рабочий код модуля).
- Проверка: typecheck 0 ошибок; на `/ru` блока нет, остальные секции на месте.

## [2026-10-07] — Google и Telegram на входе (D335) — DONE (локально, без коммита)

- Сделано: кнопка Google ведёт в Supabase OAuth и возвращается в `/auth/callback`; согласие с условиями — cookie `google_terms`. Telegram на входе и регистрации всегда живая кнопка бота, не «Скоро». X остаётся заглушкой. Локальный сайт не переписывает webhook бота. Провайдер Google в облачном Supabase включён, секрет только в Dashboard. В allow list: `https://intgetion.com/**`, `http://localhost:3000/**`, `http://127.0.0.1:3000/**`.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts src/modules/auth/__tests__/telegram.test.ts` → 46 passed. Повтор: `GET /api/auth/google?locale=ru` → Supabase → `accounts.google.com`. В браузере с `http://localhost:3000` согласие Google вернуло на `/ru` уже вошедшим.
- Миграции: `0031_account_type.sql` применена к облачной БД (`pnpm db:migrate`). Без колонки `account_type` callback падал на чтении `users`.
- Отклонения: D7 отложен OAuth на V2; основатель включил Google сейчас (D335). С `127.0.0.1` callback не видит cookie, выставленную на `localhost`, и показывает `invalid_link`. Локально открывать `http://localhost:3000`.
- OPEN QUESTION: нет.
- Следующая подфаза: по команде основателя.

## [2026-10-07] — вход через X (D336) — PARTIAL

- Сделано: кнопка X на входе и регистрации ведёт в `/api/auth/x`, дальше тот же `/auth/callback` и cookie согласия, что у Google. Новый аккаунт — кандидат. Пока провайдер выключен, кнопка возвращает `oauth_unavailable`.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts` → 28 passed; `pnpm exec tsc --noEmit` → 0. `GET /api/auth/x?locale=ru` → 307 на вход с `oauth_unavailable` (провайдер в Supabase ещё выключен). На `/ru/login` есть ссылка `/api/auth/x?locale=ru`.
- Миграции: нет.
- Отклонения: D335 оставлял X «Скоро»; основатель подключил X сейчас (D336). Портал developer.x.com требует вход в X. Вход через Google в этом браузере открыл окно выбора аккаунта и не вернул сессию на страницу X, поэтому клиент OAuth ещё не создан.
- OPEN QUESTION: нет. Client id и secret — в Dashboard Supabase, не в чате и не в git.
- Следующая подфаза: дописать провайдер X, когда в браузере есть вход в портал разработчика X.

## [2026-10-07] — переключатель новых вакансий в боте (D329) — DONE (локально, без коммита)

- Сделано: с ветки `claude/notify-bot` перенесён переключатель на `/notifications`. Он пишет канал telegram сразу для `search.alert`, `matches.digest` и `company.new_jobs`. Без привязанного Telegram выключен и ведёт в настройки аккаунта.
- Команды проверки: typecheck и eslint по затронутым файлам. Живой клик по переключателю без привязанного Telegram не сохраняет настройку — переключатель disabled.
- Миграции: нет.
- Отклонения: нет. Это обновление Claude (D329), не новая схема.
- OPEN QUESTION: нет.
- Следующая подфаза: по команде основателя.
## [2026-10-07] — телефонный Mini App, четвёртая правка — D324

- Сделано: ресерч — в проде за 2 дня почти нет `POST …/telegram/miniapp` (группировка путей: `/api/auth/telegram` ×2), значит на телефоне `initData` не появляется. Desktop ок без скрипта; телефонный WebView отдаёт данные через `telegram-web-app.js`. Одна попытка: CSP + скрипт, bounce/`tg.html` ждут bridge, `sessionStorage` для raw init, клиент ~5 с + `ready()`.
- Команды проверки: `pnpm exec vitest run src/components/auth/mini-app-open.test.ts src/lib/security.test.ts` → 0 (2 файла, 31 тест). eslint → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D324. Список хвоста: `docs/OPEN_TASKS.md`.
- OPEN QUESTION: живая проверка кнопки меню бота на телефоне. Если снова нет входа — оставить в OPEN_TASKS, без новых правок auto-sign-in.

## [2026-10-07] — телефонный Mini App после D324 — NOT DONE

- Сделано: основатель подтвердил — с телефона по кнопке меню по-прежнему не входит. D324 на проде (READY), правки входа больше не делались. Задача зафиксирована как **НЕ ЗАКРЫТО** в `docs/OPEN_TASKS.md`. Обход: вход через бота `login_*`, не Mini App menu.
- Команды проверки: код не менялся; runtime-логи Vercel (~2 ч) — вызовов `telegram/miniapp` не видно.
- Миграции: нет. Решения: нет новых (D324 остаётся последней попыткой).
- OPEN QUESTION: нет. Нужны факты с телефона (iOS/Android, URL BotFather, что на экране), прежде чем брать отдельную задачу.

## [2026-10-07] — брендированные письма Auth (D325) — ветка cursor/auth-emails

- Сделано: HTML-оболочка писем (headline/preheader/кнопка), тексты `authEmails` en/ru, hook `POST /api/auth/hooks/send-email` (Resend + Standard Webhooks), шаблоны `supabase/templates`, CSRF-исключение, в кабинете после привязки почты — «Задать пароль». Привязка почты к Telegram (D231) уже была — письмо переведено на общий бренд. **В master/прод не вливать** по просьбе основателя; включение Hook — RUNBOOK §15 / OPEN_TASKS.
- Команды проверки: `pnpm exec vitest run src/lib/email-html.test.ts src/lib/security.test.ts src/modules/auth/__tests__/auth-emails.test.ts` → 0 (3 файла, 31 тест). eslint → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D325. Ветка `cursor/auth-emails` — **не вливать в прод** без явной команды.
- OPEN QUESTION: когда выкладывать — включить Send Email Hook в Supabase и `AUTH_SEND_EMAIL_HOOK_SECRET` в Vercel (RUNBOOK §15).

## [2026-10-07] — confirm UX: localhost + confirmed page (D326) — ветка cursor/auth-confirm-ux

- Сделано: `publicAuthRedirect` в hook (localhost/чужой origin → `NEXT_PUBLIC_SITE_URL`); HTML письма без сырого URL под кнопкой; `/auth/confirmed` после успешного callback; `CheckEmailWatch` (poll `/api/me` + BroadcastChannel) обновляет вкладку на компьютере. Site URL в Dashboard при выкладке — `https://intgetion.com`.
- Команды проверки: `pnpm exec vitest run src/lib/email-html.test.ts src/modules/auth/__tests__/auth-emails.test.ts` → 0 (2 файла, 11 тестов); eslint по изменённым файлам → 0; `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D326. Влита в master (PR #7).
- OPEN QUESTION: нет.

## [2026-10-07] — повторная регистрация показывает статус (D327) — ветка cursor/register-exists

- Сделано: парольная регистрация на уже занятый email — если не подтверждён, `auth.resend` + check-email `?resent=1`; если подтверждён — `409 EMAIL_ALREADY_REGISTERED` с текстом войти/сброс. Admin lookup `findAuthUserByEmail`.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts` → 0 (25 tests); `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D327. Влита (PR #8).
- OPEN QUESTION: нет.

## [2026-10-07] — email wait: телефон подтверждает, ПК входит (D328)

- Сделано: таблица `auth_email_waits`; magic-link/register кладут `wait` в письмо; телефон → `/auth/signed-in`; ПК poll `POST /api/auth/email-wait` забирает handoff-сессию. Текст «Эта почта уже зарегистрирована» без generic при сбое resend.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts src/modules/auth/__tests__/email-wait.test.ts` → 0 (29 tests); `pnpm exec tsc --noEmit` → 0.
- Миграции: `0030_auth_email_waits.sql`. Решения: D328. Влита (PR #9).
- OPEN QUESTION: нет.

## [2026-10-07] — D328 отложено основателем — NOT DONE

- Сделано: код D328 в проде, но живой сценарий «ссылка на телефоне → вход на ПК» **не работает хорошо**. По просьбе основателя — **не чинить сейчас**, записать в `docs/OPEN_TASKS.md` как **НЕ ЗАКРЫТО / ОТЛОЖЕНО**. Обход: открыть ссылку на том же устройстве/браузере или войти паролем / Telegram-ботом.
- Команды проверки: код не менялся (только docs).
- Миграции: нет. Решения: нет новых.
- OPEN QUESTION: нет. Следующий заход — только по явной команде + факты с телефона/Network/`/api/auth/email-wait`.

## [2026-10-07] — значки Telegram / Google / X на входе

- Сделано: SVG-марки брендов напротив подписей «Continue with …» на `/login` и `/register` (`social-icons.tsx`). Google и X по-прежнему «Скоро»; Telegram — как был.
- Команды проверки: eslint + `tsc --noEmit` → 0.
- Миграции: нет. Решения: нет.
- OPEN QUESTION: нет.

## [2026-10-07] — утренние сводки, подфаза A (D340) — ветка feat/morning-briefs

- Сделано: ТЗ `docs/tz/20-morning-briefs.md`. Миграция `0032_morning_briefs.sql`: таблицы слотов, паузы, запусков и доставок плюс флаг агента у кандидата. Чистая логика слотов `notifications/lib/briefs.ts`. Cron `/api/cron/morning-briefs` (`*/15`) вместо `/api/cron/digest`. Отправка идёт через `deliverInTransaction`, Telegram доставляет D237. Есть `runSlot` с сухим прогоном для будущей админки.
- Команды проверки: `pnpm typecheck` → 0, `pnpm lint` → 0. `pnpm test`: 747 прошло, 3 упало — `legal.test.ts` и `auth-emails.test.ts`; на чистом master они падают так же, к задаче не относятся. Новый `briefs.test.ts` зелёный. `pnpm build` локально не собирается: Windows не даёт SWC писать в кэш (`ERR_SWC_NATIVE_CACHE`), это окружение, а не код — проверит CI. Интеграционный `morning-briefs.integration.test.ts` проверит CI.
- Миграции: `0032_morning_briefs.sql`. Решения: D340.
- OPEN QUESTION: нет. Следующее — подфаза B по команде.

## [2026-10-07] — кнопки в шапке: вакансия и агент (D347, D348)

- Сделано: «Разместить вакансию» в шапке и в профиле. Вошедший без тарифа сначала видит тарифы компаний; бесплатный «Старт» ведёт на форму. «Общаться с агентом» с иконкой снова в шапке и ведёт на `/chat`. Там строка про Telegram и ссылка `https://t.me/intgetion_bot`.
- Команды проверки: `pnpm exec tsc --noEmit` и `pnpm exec vitest run src/lib/viewer.test.ts src/config/pricing.test.ts src/messages/messages.test.ts` → 0. В браузере: шапка, тарифы компаний, бесплатный путь, текст и ссылка на бота.
- Миграции: нет. Решения: D347, D348.
- OPEN QUESTION: нет. Выбор бесплатного тарифа не сохраняется — оплаты ещё нет, поэтому тарифы показываются каждый раз.

## [2026-10-07] — утренние сводки, подфаза B (D349) — DONE

- Сделано: на `/notifications` галочка «Новые вакансии на почту» пишет канал `email` для тех же типов, что и Telegram. Заглушка или неподтверждённая почта — галочка выключена, ссылка «добавить почту». Переключатель «Агент подбирает мне вакансии» пишет `agent_briefs_enabled` только своему профилю; выключен — обе галочки серые. Текст Telegram для `matches.digest`: до пяти строк «Название — Компания» со ссылкой на вакансию, внизу `/matches` и `/notifications`. Кнопки шапки чуть компактнее.
- Команды проверки: на ветке `cursor/briefs-b` до слияния — `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 750 прошло, 3 упало в `legal.test.ts` и `auth-emails.test.ts` (те же, что до задачи). `pnpm build` локально не запускался: `ERR_SWC_NATIVE_CACHE`, ACL не трогал.
- P-тесты подфазы: нет отдельных P-номеров.
- Миграции: нет.
- Изменённые файлы: галочки и страница `/notifications`, сервис флага агента, payload сводки, `telegramText`, каталоги en/ru/es, тесты, шапка.
- Отклонения от ТЗ: номер сдвинут с D341 на D349, потому что D341 на master — канал Jobs Alert.
- OPEN QUESTION: нет.
- Следующая подфаза: C, только по команде.

## [2026-10-08] — утренние сводки, подфаза C (D352) — сторона работодателя

- Сделано: флаг `companies.agent_briefs_enabled` (миграция `0036`, на облако не применялась, деплоя нет). Тип `company.candidates_digest` в каталоге и в наборе галочек. Подбор кандидатов через `computeMatchesForJob` + `matching_results`, ≥ 0.65, без `is_hidden` и откликнувшихся, новые с прошлой сводки, ≤ 5. Обезличенная карточка, строгая схема payload. Вторая петля в `runSlot` с общими счётчиками; транзакция `brief_deliveries` (employer) → `deliverInTransaction` → заметка в `/chat` шаблоном. Telegram-строки со ссылкой на `/employer/jobs/{id}`, кнопка в письме. На `/employer/jobs/{id}` — короткий обезличенный список подходящих. На `/notifications` — переключатель компании (owner/admin) и подписи работодателю. Строки en/ru/es/pt-BR.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0. `pnpm test`: 788 прошло, 3 упало в `auth-emails.test.ts` (D350, незакоммиченный файл; падает, если `NEXT_PUBLIC_SITE_URL` не задан в окружении — порядок тестов). С `NEXT_PUBLIC_SITE_URL=http://localhost:3000` — 791 прошло, 1 пропущен. `pnpm build` локально не собирается: `ERR_SWC_NATIVE_CACHE` (ACL на `AppData\Local`), ACL не трогал — проверит CI. Интеграционный `employer-briefs.integration.test.ts` (скрытый, флаг выкл., 5 карточек без контактов, повтор за день) — проверит CI.
- Миграции: `0036_company_agent_briefs.sql` (не на облаке). `0035` не трогал.
- Решения: D352 (D351 уже занят оплатой).
- OPEN QUESTION: у работодателя и компании нет колонки часового пояса — все работодатели в слоте `europe` (D340 «нет пояса → europe»). Нужна ли колонка пояса? «Флаг поиска» кандидата в базе не существует — фильтруем только `is_hidden`. Нужен ли отдельный флаг «ищу работу»?
- Не коммитил.

## [2026-10-08] — утренние сводки, подфаза D (D354) — админка `/admin/briefs`

- Сделано: раздел `/admin/briefs` — три слота (IANA-пояс, время с шагом 15 мин, вкл/пауза, следующий запуск UTC и местный), глобальная пауза, «сухой прогон» и «боевой запуск» с подтверждением, журнал за 30 дней (кандидаты и работодатели отдельно), счётчики подписок по слотам. API `/api/admin/briefs/*`, права owner/admin (`jobs_scheduler.manage`/`.run`), каждое действие в `audit_log`. Миграция `0037_brief_runs_employers.sql` (`checked_employers`). Строки en/ru/es/pt-BR.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0. `pnpm test`: 791 прошло, 3 упало в `auth-emails.test.ts` (D350, нет `NEXT_PUBLIC_SITE_URL` в окружении; то же, что в подфазе C). С `NEXT_PUBLIC_SITE_URL=http://localhost:3000` — 794 прошло, 1 пропущен. `pnpm build` локально: `ERR_SWC_NATIVE_CACHE` (ACL `AppData\Local`), не трогал — проверит CI. Интеграционный `briefs-admin.integration.test.ts` (сухой прогон не пишет `brief_deliveries`/уведомления; повторный боевой → 409) — проверит CI.
- Миграции: `0037_brief_runs_employers.sql` (не на облаке). 0032–0036 не менялись.
- Решения: D354.
- OPEN QUESTION: боевой запуск требует свежий step-up (как прочие опасные действия админки); если мешает — снять флаг `dangerous`. Путь `/es/admin/...` и `/pt-BR/admin/...` реестр разделов не распознаёт (регулярка только en|ru, было до задачи) — страница сама проверяет право.
- Не коммитил, не деплоил.

## [2026-10-08] — утренние сводки, подфаза E (D355) — вступление от LLM

- Сделано: `writeBriefIntro` (OpenRouter через `llmFromEnv`, модель extract, ≤ 200 токенов, таймаут 8 с, карточки как недоверенные данные) с фолбэком на шаблон `notifications.briefIntro` (en/ru/es/pt-BR). Поле `intro` в payload `matches.digest` и `company.candidates_digest`; Telegram, почта и заметка в `/chat` начинаются с него. LLM не выбирает и не переставляет карточки.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0. `pnpm test`: 801 прошло, 3 упало в `auth-emails.test.ts` (D350, нет `NEXT_PUBLIC_SITE_URL`; как в C и D). С `NEXT_PUBLIC_SITE_URL=http://localhost:3000` — 804 прошло, 1 пропущен. `pnpm build` локально: `ERR_SWC_NATIVE_CACHE` (ACL), не трогал — проверит CI. Интеграционный `brief-intro.integration.test.ts` (ошибка LLM → шаблон, уведомление создано) — проверит CI.
- Миграции: нет. Решения: D355.
- OPEN QUESTION: в DECISIONS номера D352 и D354 встречаются дважды — параллельная работа по оплате заняла их одновременно с подфазами C и D. Нужно перенумеровать одну из сторон (предлагаю сводки: C → D356, D → D357). Интеграционные тесты C и D без шва `writeIntro` в CI с ключом OpenRouter пойдут в сеть; на результат не влияет (фолбэк), но может замедлить.
- Не коммитил, не деплоил.

## 2026-10-08 — утренние сводки: пояс работодателя, флаг поиска, испанские условия

- Пояс работодателя: колонки нет ни в `users`, ни в `companies`. Новую не добавлял. Слот `europe` теперь не молча: cron пишет `no_employer_time_zone`; дыра и миграция описаны в `docs/tz/20-morning-briefs.md` §10.3.
- Флаг «в поиске»: колонки нет. Фильтр не менял, минимальная миграция в §10.4. Остановлено до команды.
- Испанские /terms и /privacy: не начаты. Пункт 10.5 (версия 2026-10-08) есть только в незакоммиченной рабочей копии, в master его нет.
- OPEN QUESTION: добавлять ли `companies.timezone` и `candidate_profiles.job_search_status`.
- Проверки: typecheck, eslint файла, vitest notifications (78) — зелёные.

## 2026-10-08 — испанские /terms и /privacy

- Перевёл опубликованную редакцию 2026-10-08 (коммит c4cdee5), включая 10.5, в блоки `<!-- es -->` обоих файлов `docs/content/legal-*.md`. Плейсхолдеры, юрлицо и TERMS_VERSION не трогал; ссылки ведут на /es/.
- `legal-sync.mjs` режет и `es`, `legalText` отдаёт `es`. Тест проверяет свой текст, отличие от en, совпадение плейсхолдеров и отсутствие `/en/`.
- Prettier выровнял таблицы pt-BR в privacy и перевёл файлы на LF; в legal.json `\r\n` стали `\n`, смысл не менялся.
- Проверки: legal:sync, vitest legal (5), typecheck, lint зелёные. `pnpm test`: 3 падения в auth-emails — нет `NEXT_PUBLIC_SITE_URL` локально, падают и без этих правок.
