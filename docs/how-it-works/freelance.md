# Фриланс-услуги — как устроено

Модуль `src/modules/freelance`. Задачи заказчика и отклики на них — отдельная страница [freelance-tasks.md](freelance-tasks.md).

## Что делает

Исполнитель выставляет услугу с пакетами (цена, срок). После проверки модератором услуга попадает в каталог `/freelance`. Заказчик отправляет запрос, дальше заказ идёт по шагам до сдачи работы и отзыва. Стороны переписываются в комнате заказа. Исполнитель тоже может оценить заказчика. Деньги не лежат у платформы: оплата идёт прямым переводом с кошелька на кошелёк (D447, D463). Spoki ищет услуги, называет вилку цен и ведёт черновик услуги (D460, D493).

## Главные файлы

| Что                                     | Где                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Вход модуля (другие модули — только он) | `src/modules/freelance/service/index.ts`                                                               |
| Услуги, модерация, пауза                | `service/listing-service.ts`, флаги для модератора `service/flags.ts` (D462)                           |
| Каталог и страница услуги               | `service/catalog.ts`, поиск `schemas/search.ts`                                                        |
| Заказ: запрос → сдача → отзыв           | `service/order-service.ts`, переходы `service/transitions.ts`, правила `service/rules.ts`              |
| Заказ глазами стороны                   | `service/party-service.ts` (`getOrderView`, `moveOrder`)                                               |
| Срок заказа (B4)                        | `service/order-deadline.ts` (D576)                                                                     |
| Комната заказа (A1)                     | `service/order-room-service.ts`, `service/order-room.ts`, `repo/room-repo.ts` (D566, D567)             |
| Отзыв о заказчике (A2)                  | `service/client-review-service.ts`, `repo/client-review-repo.ts` (D568)                                |
| Значки и итоги исполнителя (A5)         | `service/seller-record-service.ts`, `service/seller-score.ts` (D576)                                   |
| Оплата заказа                           | `service/payment-service.ts`, `repo/payment-repo.ts` (D463); касса — модуль billing                    |
| Эскроу (прототип, шаг 2а)               | `service/escrow-service.ts` — чистые функции, ни к одному маршруту не подключены (D564)                |
| Жалобы                                  | `service/report-service.ts`                                                                            |
| Черновик услуги (сайт и Spoki)          | `service/drafts.ts` (D493)                                                                             |
| Инструменты Spoki и MCP                 | `service/bot-tools.ts` (`freelanceTools`)                                                              |
| Кнопки «Принять»/«Отказать» в Telegram  | `service/telegram-actions.ts` (`handleFreelanceTelegramCallback`)                                      |
| Уведомления                             | `service/notices.ts` (`orderNotice`)                                                                   |
| Интерфейс                               | `ui/*.tsx` (форма услуги, карточка, действия заказа, комната, форма жалобы, переключатель исполнителя) |

## Таблицы и миграции

| Таблица                                                                                                                             | Миграция                                            |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `freelance_sellers`, `freelance_services`, `freelance_packages`, `freelance_orders`, `freelance_order_history`, `freelance_reviews` | `0050_freelance.sql`                                |
| `reports` (жалобы на услугу и заказ)                                                                                                | `0055_freelance_reports.sql` (правка общей таблицы) |
| `freelance_order_payments`                                                                                                          | `0056_freelance_payments.sql`                       |
| `freelance_service_drafts`                                                                                                          | `0062_freelance_service_drafts.sql`                 |
| старая `freelance_payout_wallets` удалена, адрес выплат — кошелёк аккаунта                                                          | `0069_drop_freelance_payout_wallets.sql` (D518)     |
| `freelance_threads`, `freelance_messages`                                                                                           | `0071_freelance_room.sql`                           |
| `freelance_client_reviews`                                                                                                          | `0072_freelance_client_reviews.sql`                 |

Схема Drizzle: `src/db/schema/freelance.ts`. По MISSION_LOG миграции `0071`–`0084` применены к облаку 2026-10-29 (D438). Модерация пишет в общую `moderation_queue`.

## Маршруты и страницы

- Страницы: `/freelance` (каталог), `/freelance/[slug]` (услуга), `/freelance/orders`, `/freelance/orders/[id]` (заказ и комната), `/profile/freelance`, `/profile/freelance/new`, `/profile/freelance/[id]/edit` (кабинет исполнителя), касса `/billing/crypto?freelance=`.
- Админка: `/admin/freelance/[id]`, очередь — `/admin/moderation`.
- API: `/api/freelance/services` (+ `[id]`, `[id]/submit`, `[id]/pause`, `[id]/report`), `/api/freelance/seller`, `/api/freelance/service-draft`, `/api/freelance/requests`, `/api/freelance/orders/[id]/transition`, `/api/freelance/orders/[id]/messages`, `/api/freelance/orders/[id]/payment`, `/api/freelance/orders/[id]/report`, `/api/freelance/payments/[id]` (+ `confirm`), `/api/freelance/reviews`, `/api/freelance/client-reviews`.
- Cron: `/api/cron/freelance` каждые 15 минут — `runOrderTimers`, `recheckOrderPayments`, `expireOldTasks`.
- Telegram: `/api/telegram/webhook` передаёт нажатия кнопок в `handleFreelanceTelegramCallback`.
- Spoki: входы `/chat?service=`, `/chat?order=`, открытые карточки — `GET /api/bot/conversation`.
- Sitemap: `listFreelanceSitemapEntries` в `src/app/sitemap.ts`.

## Env

Своих переменных у модуля нет. Оплата заказа зависит от кассы: `BILLING_ENABLED`, `BILLING_CRYPTO_PROVIDER`, `RPC_URL_*` — см. [billing.md](billing.md).

## ТЗ и решения

ТЗ: [28-freelance.md](../tz/28-freelance.md), [43-freelance-escrow.md](../tz/43-freelance-escrow.md), [44-freelance-upwork-parity.md](../tz/44-freelance-upwork-parity.md), [45-freelance-order-room.md](../tz/45-freelance-order-room.md), [46-freelance-client-reviews.md](../tz/46-freelance-client-reviews.md), [49-freelance-invites-record-deadline.md](../tz/49-freelance-invites-record-deadline.md).

D: 446, 447 (основа, деньги не у платформы), 456 (уведомления), 460 (Spoki), 462 (флаги модератору), 463 (прямая оплата), 493 (черновик услуги), 518 (кошелёк аккаунта), 562, 564 (эскроу), 565 (план Upwork), 566, 567 (комната), 568 (отзыв о заказчике), 576 (значки, срок).

## Что не сделано

- Эскроу (ТЗ 43): шаг 2а — только код и тесты без сети; шаг 2б (тестовая сеть Base Sepolia) ждёт тестовых кошельков; для настоящих денег открыты арбитр, лимит суммы, аудит.
- Этапы B и C ТЗ 44 (споры, этапы, документы, фиат, налоги, почасовая) — кода нет.
- Не пройден первый живой перевод (услуга на $10, USDC на Base) — нужно «да» основателя; тестовой сети в кассе нет.
- Экраны под входом (карточки в чате, жалоба, «Оплатить», кошелёк) глазами не проверены; вход блокирует квота Supabase Auth (402).
- Открытые вопросы — ТЗ 28 §28.13, D568 (тексты отзыва, «слепая» публикация).
