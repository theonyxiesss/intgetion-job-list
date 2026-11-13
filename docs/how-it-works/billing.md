# Оплата — как устроено

Модуль `src/modules/billing` и общие помощники `src/lib/billing/`. Подробности перевода, угроз и переменных — [../PAYMENTS.md](../PAYMENTS.md), цены — [../PRICING.md](../PRICING.md).

## Что делает

Покупатель платит со своего кошелька в браузере (WalletConnect или кошелёк браузера) в USDT или USDC на EVM-адрес компании-оператора; сеть выбирает покупатель (D351, D352). Сервер не подписывает транзакции: он выдаёт заказ, проверяет подпись кошелька (SIWE), затем читает перевод из сети и подтверждает заказ. Адрес из санкционного списка не принимается. Что покупают: размещение и продвижение вакансии (hire), тариф «Команда» для компании. Та же касса принимает оплату заказа фриланса и взнос бюджета UGC (модули freelance и ugc вызывают её через вход billing).

## Главные файлы

| Что                               | Где                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Вход                              | `src/modules/billing/service/index.ts`                                                                                                     |
| Заказы, тарифы, подписи, санкции  | `service/billing-service.ts` (`createCryptoOrder`, `confirmHireOrder`, `billingMe`, `verifyWalletSignature`, `refreshSanctionsList`)       |
| Письмо после оплаты размещения    | `service/hire-mail.ts`                                                                                                                     |
| Касса включена?                   | `cryptoCheckoutOn()`: `BILLING_ENABLED=true` и `BILLING_CRYPTO_PROVIDER=walletconnect`                                                     |
| Сети, RPC, проверка перевода      | `src/lib/billing/chains.ts`, `rpc.ts`, `verify-transfer.ts`, `status.ts`                                                                   |
| SIWE, санкции, места в команде    | `src/lib/billing/siwe.ts`, `sanctions.ts`, `seats.ts`                                                                                      |
| Эскроу (общая часть для фриланса) | `src/lib/billing/escrow.ts` (D564, прототип)                                                                                               |
| Не-EVM (Solana, Tron)             | `src/lib/billing/non-evm/`; с кассы скрыты, оплата только EVM (D432)                                                                       |
| Интерфейс                         | `ui/crypto-pay.tsx`, `ui/freelance-pay.tsx`, `ui/non-evm-pay.tsx`, `ui/account-wallet.tsx`, `ui/connect-wallet.ts`, `ui/interest-form.tsx` |

## Таблицы и миграции

| Таблица                                                                              | Миграция                                                             |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `plans`, `purchases`, `crypto_orders`, `billing_wallet_sessions`, `billing_interest` | `0038_billing_hire.sql`, тарифы — `0039_billing_plans.sql`           |
| `sanctioned_addresses`                                                               | `0046_sanctions.sql`                                                 |
| уникальность хэша только у `confirmed`                                               | `0086_crypto_orders_confirmed_tx.sql` (на облаке с 2026-11-01, D589) |

Таблицы читаются сырым SQL в `billing-service.ts`, отдельного файла схемы Drizzle у них нет.

## Маршруты и страницы

- Публичная `/pricing` показывает четыре тарифа аккаунта из `ACCOUNT_PLANS`, только действующие ссылки оплаты из `planPayHref`, разовые покупки, комиссию и FAQ. Оболочка V2 использует компактные карточки; годовые цены остаются справочной строкой, потому что касса оплачивает месяц на 30 дней. Ссылка «Спросите Spoki» ведёт в существующий `/chat`.
- Страницы: `/billing/crypto` (касса; `?freelance=` — заказ фриланса), `/employer/billing`, блок тарифа на `/account`, кнопки на `/employer/jobs/[id]` и `/jobs/[id]`.
- API: `/api/billing/me`, `/api/billing/interest`, `/api/billing/crypto/order`, `/api/billing/crypto/orders/[id]`, `/api/billing/crypto/confirm`, `/api/billing/crypto/siwe/nonce`, `/api/billing/crypto/siwe/verify`.
- Cron: `/api/cron/billing` каждую минуту — `recheckSubmittedOrders`; `/api/cron/sanctions` в 02:40 UTC — `refreshSanctionsList`.

## Env (без значений)

`BILLING_ENABLED`, `BILLING_CRYPTO_PROVIDER`, `BILLING_TOKEN_CONTRACTS`, `COMPANY_WALLET_ADDRESS`, `COMPANY_WALLET_SOLANA`, `COMPANY_WALLET_TRON`, `RPC_URL_ETHEREUM`, `RPC_URL_BASE`, `RPC_URL_ARBITRUM`, `RPC_URL_POLYGON`, `RPC_URL_SOLANA`, `RPC_URL_TRON`, `OFAC_SDN_URL`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Письма — `RESEND_API_KEY`, `EMAIL_FROM`.

## ТЗ и решения

ТЗ: [23-billing.md](../tz/23-billing.md), хвосты — [25-held-tails.md](../tz/25-held-tails.md), очередь Клода (санкции, Tron/Solana) — [24-claude-held.md](../tz/24-claude-held.md).

D: 351, 352 (WalletConnect на EVM-адрес), 356 (приём включён), 366, 367, 380, 384, 403 (Project ID), 406 (скилл WalletConnect), 422, 425, 432 (только EVM), 463 (оплата фриланса), 466 (взнос UGC), 518 (кошелёк аккаунта), 586 (платёжный рельс), 589 (хэш заказа).

## Что не сделано

- Тестовой сети в кассе нет; первый живой перевод фриланса не пройден (нужно «да» основателя).
- Solana и Tron скрыты с кассы.
- Карты, фиат и автовозврат — не писать (ТЗ 24).
- Контекст нескольких компаний: `billingMe` объединяет покупки всех компаний человека, а `/account` показывает один тариф (D570, открыто).
