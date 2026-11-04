# UGC-видео — как устроено

Модуль `src/modules/ugc`. Компания заказывает короткие ролики у креаторов: бриф кампании → приглашения и заявки → сдача ролика → решение → выплата награды.

## Что делает

- Компания пишет бриф (на сайте или со Spoki, общий черновик `ugc_brief_drafts`, D492), вносит бюджет кампании, приглашает креаторов или принимает заявки.
- Креатор заполняет профиль, принимает приглашение, переписывается в комнате, сдаёт ссылку на ролик (TikTok, Instagram, YouTube), правит по замечаниям.
- Компания принимает работу или просит правку; есть сроки ответа, спор, жалобы на сообщения, история версий брифа и ролика.
- Деньги: при включённой кассе и адресе кошелька компании нужен взнос бюджета на кошелёк (`escrowOn` = касса включена и задан `COMPANY_WALLET_ADDRESS`); выплаты креатору — переводом на кошелёк аккаунта, возвраты — по журналу.
- Единственный путь записи — `service/commands.ts`: им пользуются и страницы, и Spoki (27.8, 27.17).

## Главные файлы

| Что                               | Где                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Вход                              | `src/modules/ugc/service/index.ts`                                                                                        |
| Все записи                        | `service/commands.ts`                                                                                                     |
| Правила и переходы                | `service/rules.ts`, `service/transitions.ts`                                                                              |
| Хранилище                         | `service/store.ts`, `repo/ugc-repo.ts`, `repo/escrow-repo.ts`                                                             |
| Взнос, выплаты, возвраты, журнал  | `service/escrow.ts`, `service/escrow-gate.ts`, `service/escrow-rules.ts`, `service/ledger.ts`, `service/money-history.ts` |
| Комната, споры, сроки             | `service/room.ts`, `service/dispute-clock.ts`, `service/review-clock.ts`                                                  |
| Сдача, версии, доставка товара    | `service/delivery.ts`, `service/versions.ts`                                                                              |
| Кабинет компании и место креатора | `service/workspace.ts`, `service/workspace-view.ts`, `service/creator-workspace.ts`                                       |
| Следующий шаг и прогресс          | `service/next-step.ts`, `service/progress.ts`                                                                             |
| Цены-ориентиры                    | `service/pricing.ts`                                                                                                      |
| Черновик брифа                    | `service/drafts.ts`                                                                                                       |
| Spoki                             | `service/bot-tools.ts` (`ugcTools`), память `service/memory.ts`                                                           |
| Вход из Telegram                  | `service/telegram-start.ts`, `service/start-payload.ts`                                                                   |
| Плееры роликов                    | `service/embed.ts` (D578)                                                                                                 |
| Интерфейс                         | `ui/*.tsx` (бриф, заявка, комната, сдача, спор, рабочий стол)                                                             |

## Таблицы и миграции

| Таблица                                                                                  | Миграция                                                                          |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `creator_profiles`, `ugc_campaigns`, `ugc_invites`, `ugc_submissions`, `ugc_join_tokens` | `0051_ugc.sql`                                                                    |
| нити Spoki у приглашений                                                                 | `0052_ugc_threads.sql`                                                            |
| просмотры ролика                                                                         | `0053_ugc_reported_views.sql`                                                     |
| `ugc_payouts`                                                                            | `0054_ugc_payouts.sql`                                                            |
| `ugc_deposits`, `ugc_refunds`                                                            | `0057_ugc_escrow.sql`                                                             |
| `ugc_brief_drafts`                                                                       | `0061_ugc_brief_drafts.sql`                                                       |
| пауза кампании                                                                           | `0067_ugc_campaign_paused.sql`                                                    |
| условия, шортлист, вопросы                                                               | `0074_ugc_terms_snapshot.sql`, `0075_ugc_shortlist.sql`, `0076_ugc_questions.sql` |
| `ugc_campaign_versions`                                                                  | `0077_ugc_campaign_versions.sql`                                                  |
| `ugc_room_messages`                                                                      | `0078_ugc_room_messages.sql`                                                      |
| срок проверки                                                                            | `0079_ugc_review_clock.sql`                                                       |
| `ugc_room_reports`                                                                       | `0080_ugc_room_reports.sql`                                                       |
| `ugc_submission_versions`                                                                | `0081_ugc_submission_versions.sql`                                                |
| `ugc_shipments`                                                                          | `0082_ugc_shipments.sql`                                                          |
| `ugc_disputes`                                                                           | `0083_ugc_disputes.sql`                                                           |
| `ugc_room_reads`                                                                         | `0085_ugc_room_reads_decided.sql`                                                 |

Схема: `src/db/schema/ugc.ts`. Константы: `src/config/ugc.ts`.

## Маршруты и страницы

- Компания: `/campaigns`, `/campaigns/new`, `/campaigns/list`, `/campaigns/orders`, `/campaigns/materials`, `/campaigns/creators`, `/campaigns/payments`, `/campaigns/[id]`, `/campaigns/[id]/room/[inviteId]`, `/campaigns/[id]/winners`.
- Креатор: `/creator`, `/creator/join`, `/creator/invites`, `/creator/campaigns`, `/creator/workspace`.
- Админка: `/admin/campaigns`, `/admin/campaigns/ledger`, `/admin/campaigns/disputes/[id]`.
- API: `/api/ugc`, `/api/ugc/brief-draft`, `/api/ugc/campaigns/[id]/deposit`, `/api/ugc/deposits/[id]`, `/api/ugc/deposits/[id]/confirm`.
- Cron: `/api/cron/ugc` раз в день (08:20 UTC) — `recheckCampaignDeposits`, `sweepRoomMessages`.
- Telegram: `/api/telegram/webhook` → `handleUgcTelegramStart`. Spoki: `/api/bot/message`, `/api/bot/conversation`.

## Env

`COMPANY_WALLET_ADDRESS` (адрес приёма взноса). Включение кассы — `BILLING_ENABLED`, `BILLING_CRYPTO_PROVIDER` (см. [billing.md](billing.md)).

## ТЗ и решения

ТЗ: [27-ugc.md](../tz/27-ugc.md), [48-ugc-workspace-and-delivery.md](../tz/48-ugc-workspace-and-delivery.md). Сравнение рынка — [../UGC_MARKET_BENCHMARK.md](../UGC_MARKET_BENCHMARK.md).

D: 442, 457–459 (фазы A–C), 464–467 (Spoki, взнос, следующий шаг), 492 (черновик), 518 (кошелёк аккаунта), 572 (полный заказ, U0–U8), 575, 579 (доставка товара выключена), 578 (плееры), 580 (цена плана), 590 (срок реакции поддержки).

## Что не сделано

- U6 — доставка физического товара выключена (D575, D579).
- Автоматический рельс выплат и юрист по деньгам; оплата плана за $49 (D580) не включена.
- Перевода интерфейса на все языки нет (status: PARTIAL).
- Срок реакции поддержки 3 рабочих дня (D590) ждёт подтверждения основателя.
- Экраны под входом и на телефоне не проверены (квота Supabase Auth, 402).
