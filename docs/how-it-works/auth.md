# Auth — как устроено

ТЗ: D7 в [../tz/02-decisions-registry.md](../tz/02-decisions-registry.md). Статус: [../status/INDEX.md](../status/INDEX.md).

## Потоки

- Email + пароль и magic link через **Supabase Auth** (`@supabase/ssr`).
- После подтверждения: `/auth/callback` → строка `users`, привязка гостевой бот-сессии при наличии cookie.
- Страницы: `/[locale]/login`, `register`, `reset-password`.
- Привязка уже существующего аккаунта: «Настройки → Аккаунт». Google и X — `linkIdentity`; Telegram — бот, опрос `/api/auth/telegram/link` (D339).
- API: `/api/me` и guards в `src/lib/auth-guards.ts`.

## Ключевые пути

| Что                       | Где смотреть                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Callback / session        | `src/app` auth routes, `src/lib/supabase/**`                                                                                                        |
| Guards                    | `src/lib/auth-guards.ts`                                                                                                                            |
| Mini App / TG open        | `src/components/auth/**`, решения D318–D322                                                                                                         |
| Письма каталога (не Auth) | `src/modules/notifications` + Resend                                                                                                                |
| Макет всех писем (D330)   | `src/lib/email-html.ts`; auth-шаблоны `src/lib/auth-email-templates.ts` → `supabase/templates/*.html`; превью `/dev-emails/index.html` (только dev) |

## Заметки

- Site URL для ссылок в письмах: `NEXT_PUBLIC_SITE_URL` (прод: https://intgetion.com). Неверный Site URL в Supabase → localhost в письмах.
- Google: `/api/auth/google` вызывает Supabase `signInWithOAuth`, «Привязать Google» — `linkIdentity` (D335, D339). `redirectTo` — страница сайта `/{locale}/auth/callback`. Хост в строке Google «Перейти в додаток …» — хост callback Supabase (`/auth/v1/callback`). Имя приложения на экране согласия — отдельная подпись в Google Cloud, её этот путь не задаёт.
- Auth-письма Supabase и каталог уведомлений — разные домены типов (см. `catalog.ts`).
- Cross-device handoff (D328) — **DEFERRED**, см. [../OPEN_TASKS.md](../OPEN_TASKS.md).
- Смена пароля требует свежей сессии (`secure_password_change = true`, D487): Supabase меняет пароль без кода, только если сессия моложе 24 часов. На сайте пароль меняется только по ссылке сброса (`/reset-password` → `POST /api/auth/password` → `changePassword`), она открывает новую сессию. Письмо `reauthentication` хук `send-email` не отправляет (`authEmailKindFromAction` его не знает), поэтому старым или украденным токеном пароль не сменить.
- Ошибки входа (D606): `isAuthOutageStatus` (`src/lib/supabase/auth-health.ts`) — 402, 5xx или нет ответа значат «Auth недоступен у всех» → `503 AUTH_UNAVAILABLE`. Форма разбирает ответ через `src/components/auth/auth-failure.ts`: сеть, Auth недоступен, неверные данные — разные тексты `auth.errors.*`. Google/X при общей блокировке → `/login?error=auth_unavailable&ref=<x-request-id>`. `checkAuthHealth` (кэш 30 с) используют `/api/health` и Telegram-вход.
- Один аккаунт (D517): «Мой аккаунт» (`/account`) — «Обо мне» (обязательно только имя, остальное свёрнуто), тарифы из `billingMe` (личный; тариф компании — её членам), «Мои сервисы» без ролей, «Вход и безопасность» (`AccountSignIn` + кошелёк). `/profile` ведёт сюда, анкета поиска работы — `/profile/edit`. Права остаются там, где были: членство в компании, тариф.
- Страница «Аккаунт» целиком (модули users, candidates, privacy) — [account.md](account.md); Telegram целиком — [telegram.md](telegram.md).
- Кошелёк аккаунта (D518): `user_wallets` (0068), сервис `src/modules/users/service/wallet.ts`, API `GET|DELETE /api/me/wallet`, `POST /api/me/wallet/nonce`, `POST /api/me/wallet/verify` (лимит `accountWallet`). Подключение — существующие WalletConnect / кошелёк браузера (`connect-wallet.ts`), привязка — только по SIWE-подписи, проверенной на сервере; адрес на одном аккаунте (уникальный индекс), санкционный — не сохраняется. Фриланс и UGC читают адрес выплат через `readAccountWallet`. Смена и отключение запрещены, пока UGC-награды из оплаченного бюджета ждут выплаты на этот адрес; платежи фриланса хранят своего получателя и не перенаправляются. Каждая привязка, смена и отключение — строка `audit_logs`.

## Модуль коротко

- **Вход модуля:** `src/modules/auth/service/index.ts` — `register`, `signIn`, `sendMagicLink`, `requestPasswordReset`, `changePassword`, `completeCallback`, `getCurrentUser` / `requireCurrentUser`, `logout`, Google и X (`startGoogleSignIn`, `startXSignIn`, `unlinkOAuthProvider`), Telegram (`signInWithTelegram`, `linkTelegram`, `unlinkTelegram`, `handleTelegramWebhook`, `verifyTelegramInitData`), смена почты (`requestEmailAdd`, `confirmEmailAdd`), хук писем (`handleSendEmailHook`), ожидание письма (`beginEmailWait`, `claimEmailWait`).
- **Файлы:** `service/auth-service.ts`, `auth-emails.ts`, `send-email-hook.ts`, `email-change.ts`, `email-wait.ts`, `handoff.ts`, `mail-ready.ts`, `telegram*.ts`; SQL — `repo/users.ts`, `repo/telegram-accounts.ts`, `repo/telegram-login.ts`, `repo/auth-email-wait.ts`; пароли — `schemas/common-passwords.ts`.
- **Таблицы:** `users` (`0001_enums_and_users.sql`, тип аккаунта — `0031`), `audit_logs` (`0002`), `telegram_accounts` (`0023`), `telegram_login_challenges` (`0028_telegram_login.sql`), `auth_email_waits` (`0030_auth_email_waits.sql`). Пароли хранит только Supabase Auth.
- **Маршруты:** страницы `/login`, `/register`, `/reset-password`, `/auth/callback`; API `/api/auth/register`, `login`, `logout`, `magic-link`, `reset`, `password`, `google`, `x`, `oauth/unlink`, `email-wait`, `handoff`, `hooks/send-email`, `telegram/*`; `/api/me`, `/api/me/email`, `/api/me/email/confirm`.
- **Env (без значений):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SEND_EMAIL_HOOK_SECRET`, `PRIVACY_HASH_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_LOGIN_ENABLED`, `TELEGRAM_MINI_APP_ENABLED`.
- **D:** 7, 37, 38, 217, 230, 231, 256, 259, 311–328, 330, 331, 335, 336, 339, 349, 426, 428, 453, 487, 506, 517, 518.

## Что не сделано

- Supabase Auth отвечает 402 `exceed_egress_quota` (с 2026-10-29): вход по почте, Google и завершение входа через Telegram на сайте не работают; нужно действие владельца в кабинете Supabase. С D606 человек видит «вход временно недоступен для всех» с кодом обращения (`x-request-id`), а `/api/health` — `{"ok":false,"db":"up","auth":"down"}` (503).
- D328 (ссылка с телефона — вход на компьютере) отложен.
- X-вход не проверен; свой домен `auth.intgetion.com` не включён (платное дополнение Supabase).
- SEC-20261014-6: проверка утёкших паролей в Supabase Auth не включена.
