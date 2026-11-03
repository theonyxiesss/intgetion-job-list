# Аккаунт — как устроено

Один аккаунт INTGETION на все сервисы (D517). Вход, пароль, Google, X и Telegram — [auth.md](auth.md). Здесь — модули `users` (общая анкета и кошелёк), `candidates` (анкета поиска работы) и `privacy` (согласия, выгрузка, удаление, сроки хранения).

## Что делает

- **«Мой аккаунт» (`/account`)**: «Обо мне» (обязательно только имя), тарифы из `billingMe`, «Мои сервисы», «Вход и безопасность» с кошельком. `/profile` ведёт сюда, анкета поиска работы — `/profile/edit`.
- **Общая анкета** (`users`, таблица `user_profiles`): имя, языки и другие общие факты; изменения переносятся в анкеты сервисов (`applySharedPatch`, D505, D509). Spoki меняет её только через карточку подтверждения.
- **Кошелёк аккаунта** (`users`, D518): привязка только по SIWE-подписи, проверенной на сервере; один адрес — один аккаунт; санкционный адрес не сохраняется. Фриланс и UGC читают адрес выплат через `readAccountWallet`. Смена и отключение запрещены, пока UGC-награды ждут выплаты на этот адрес. Каждое действие — строка `audit_logs`.
- **Анкета кандидата** (`candidates`): навыки, опыт, предпочтения, часовой пояс IANA, видимость, полнота анкеты (`profileCompleteness`), переключатель «Агент подбирает мне вакансии» (`agent_briefs_enabled`). Витрина исполнителя фриланса — `getSellerStorefronts`.
- **Приватность** (`privacy`): согласие на cookie (`recordConsent`), выгрузка всех своих данных (`exportMyData`), удаление аккаунта (`deleteMyAccount`, повтор удаления в Auth — `AUTH_DELETE_RETRY_DAYS` = 7), ежечасная чистка по срокам (`runRetention`).

## Главные файлы

| Модуль       | Вход                                      | Остальное                                                                                                                                                 |
| ------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`      | `src/modules/users/service/index.ts`      | `service/shared-profile.ts`, `service/wallet.ts`, `repo/shared-profile-repo.ts`, `repo/wallet-repo.ts`, `ui/shared-profile-form.tsx`                      |
| `candidates` | `src/modules/candidates/service/index.ts` | `service/candidate-service.ts`, `service/completeness.ts`, `service/profile-patch.ts`, `service/storefront.ts`, `service/timezone.ts`, `repo/profiles.ts` |
| `privacy`    | `src/modules/privacy/service/index.ts`    | `service/privacy-service.ts`, `service/consent-service.ts`, `repo/privacy-repo.ts`; сроки — `src/config/retention.ts`                                     |

## Таблицы и миграции

| Таблица                                                                                                         | Миграция                                                                                          |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `users` (тип аккаунта — `0031_account_type.sql`)                                                                | `0001_enums_and_users.sql`                                                                        |
| `candidate_profiles`, `candidate_skills`, `candidate_experience`, `candidate_preferences`, `candidate_contacts` | `0005_candidate_profiles.sql`; `0020_digest_tracking.sql`, `0041_candidate_job_search_status.sql` |
| `consent_records`                                                                                               | `0021_consent_records.sql`                                                                        |
| `user_profiles`                                                                                                 | `0064_user_profiles.sql`; старые поля — `0065`, `0066`                                            |
| `user_wallets`                                                                                                  | `0068_user_wallets.sql` (`0069` удалила `freelance_payout_wallets`)                               |

`runRetention` и `deleteMyAccount` трогают почти все таблицы с `user_id` (бот, отклики, уведомления, кошелёк, анкеты).

## Маршруты и страницы

- Страницы: `/account`, `/profile`, `/profile/edit`, `/onboarding`, `/settings/account`, `/settings/email`, `/settings/privacy` (там же память Spoki), `/settings/notifications`.
- API аккаунта: `/api/me`, `/api/me/profile`, `/api/me/export`, `/api/me/email`, `/api/me/email/confirm`, `GET|DELETE /api/me/wallet`, `POST /api/me/wallet/nonce`, `POST /api/me/wallet/verify`, `/api/consent`.
- API кандидата: `/api/candidates/me`, `/api/candidates/me/visibility`, `/api/candidates/me/contacts`, `/api/candidates/[id]`, `/api/notifications/agent-briefs`.
- Cron: `/api/cron/retention` в 20 минут каждого часа.

## Env

Своих переменных у трёх модулей нет. Лимит привязки кошелька — `accountWallet` в `src/lib/rate-limit.ts`.

## ТЗ и решения

ТЗ: [30-one-account.md](../tz/30-one-account.md), [05-privacy-rights.md](../tz/05-privacy-rights.md), [17-gdpr.md](../tz/17-gdpr.md), [11-taxonomy.md](../tz/11-taxonomy.md) (полнота анкеты), план проверки личности — [51-unified-account-verification.md](../tz/51-unified-account-verification.md).

D: 16 (контакты отдельно), 28, 165, 166 (выгрузка и удаление), 471 (переписка Spoki 24 часа), 503–509 (общая анкета), 517 (один аккаунт), 518 (кошелёк), 570 (несколько компаний), 599 (проверка личности, план).

## Что не сделано

- Этапы В и Г ТЗ 30 отложены основателем («оставь на будущее»).
- Переключатель компании и права по `company_id` для человека в нескольких компаниях (D570) — открыто.
- Проверка личности на единый аккаунт (ТЗ 51, D599) — только план; документы и провайдер ждут решения.
- Вход сейчас блокирует квота Supabase Auth (402), поэтому экраны под входом на сайте не перепроверены.
