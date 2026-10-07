# Auth — как устроено

ТЗ: D7 в [../tz/02-decisions-registry.md](../tz/02-decisions-registry.md). Статус: [../status/INDEX.md](../status/INDEX.md).

## Потоки

- Email + пароль и magic link через **Supabase Auth** (`@supabase/ssr`).
- После подтверждения: `/auth/callback` → строка `users`, привязка гостевой бот-сессии при наличии cookie.
- Страницы: `/[locale]/login`, `register`, `reset-password`.
- Привязка уже существующего аккаунта: «Настройки → Аккаунт». Google и X — `linkIdentity`; Telegram — бот, опрос `/api/auth/telegram/link` (D339).
- API: `/api/me` и guards в `src/lib/auth-guards.ts`.

## Ключевые пути

| Что | Где смотреть |
| --- | ------------ |
| Callback / session | `src/app` auth routes, `src/lib/supabase/**` |
| Guards | `src/lib/auth-guards.ts` |
| Mini App / TG open | `src/components/auth/**`, решения D318–D322 |
| Письма каталога (не Auth) | `src/modules/notifications` + Resend |
| Макет всех писем (D330) | `src/lib/email-html.ts`; auth-шаблоны `src/lib/auth-email-templates.ts` → `supabase/templates/*.html`; превью `/dev-emails/index.html` (только dev) |

## Заметки

- Site URL для ссылок в письмах: `NEXT_PUBLIC_SITE_URL` (прод: https://intgetion.com). Неверный Site URL в Supabase → localhost в письмах.
- Auth-письма Supabase и каталог уведомлений — разные домены типов (см. `catalog.ts`).
- Cross-device handoff (D328) — **DEFERRED**, см. [../OPEN_TASKS.md](../OPEN_TASKS.md).
