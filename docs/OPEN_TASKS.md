# OPEN_TASKS

Открытые хвосты вне (или поверх) roadmap. Закрыл — вычеркни и обнови [CURRENT.md](CURRENT.md) + [status/INDEX.md](status/INDEX.md).

## OPEN

### Phone Telegram Mini App

- Симптом: вход / сессия на телефоне в Mini App нестабильны (фрагмент `#tgWebAppData`, куки, редиректы).
- Уже в коде/решениях: D318–D322 (см. [DECISIONS.md](DECISIONS.md) хвост + [archive/decisions/D301-plus.md](archive/decisions/D301-plus.md)).
- MISSION_LOG: записи «телефонный Mini App», «Mini App вживую — NOT DONE».
- Не начинать без явной команды основателя.

### Social login UI marks

- Кнопки Telegram / Google / X сняты с экранов входа и регистрации (D324). Компонент-заглушка в репозитории больше не подключён. OAuth по-прежнему V2 (D7): провайдеров не подключать без решения.

## DEFERRED

### D328 — cross-device magic-link handoff (phone open → PC finish)

- Идея: `auth_email_waits` + poll/claim; телефон «открыл ссылку», сессия на PC.
- Статус: **отложено основателем** («пока не работает хорошо»). Не итерировать, пока не скажут явно.
- На этом `master` решений D325–D328 может ещё не быть — сверять `git log` / DECISIONS перед работой.

## Закрытые недавно (для памяти)

- Документация: docs-reorg — см. MISSION_LOG этой сессии.
