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
- Один аккаунт (D517): «Мой аккаунт» (`/account`) — «Обо мне» (обязательно только имя, остальное свёрнуто), тарифы из `billingMe` (личный; тариф компании — её членам), «Мои сервисы» без ролей, «Вход и безопасность» (`AccountSignIn` + кошелёк). `/profile` ведёт сюда, анкета поиска работы — `/profile/edit`. Права остаются там, где были: членство в компании, тариф.
- Кошелёк аккаунта (D518): `user_wallets` (0068), сервис `src/modules/users/service/wallet.ts`, API `GET|DELETE /api/me/wallet`, `POST /api/me/wallet/nonce`, `POST /api/me/wallet/verify` (лимит `accountWallet`). Подключение — существующие WalletConnect / кошелёк браузера (`connect-wallet.ts`), привязка — только по SIWE-подписи, проверенной на сервере; адрес на одном аккаунте (уникальный индекс), санкционный — не сохраняется. Фриланс и UGC читают адрес выплат через `readAccountWallet`. Смена и отключение запрещены, пока UGC-награды из оплаченного бюджета ждут выплаты на этот адрес; платежи фриланса хранят своего получателя и не перенаправляются. Каждая привязка, смена и отключение — строка `audit_logs`.
