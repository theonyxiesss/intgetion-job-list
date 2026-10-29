# Status — что работает

Легенда: **OK** · **PARTIAL** · **BROKEN** · **DEFERRED** · **OUT** (не MVP).

Обновлять вместе с [../CURRENT.md](../CURRENT.md).

| Зона                              | Статус         | Заметка                                                                                   |
| --------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| Auth password / magic link        | BROKEN         | Supabase Auth отвечает 402 `exceed_egress_quota`; реальные отправка/вход не перепроверены |
| Auth emails (Supabase templates)  | BROKEN         | Auth API ограничен 402, хук и доставка отдельно не проверены                              |
| Register / login UI               | PARTIAL        | Страница открывается, вход через Supabase заблокирован 402                                |
| Auth Telegram                     | BROKEN         | Старт через бота работает; завершение сессии требует Supabase Auth                        |
| Candidate profile                 | OK             |                                                                                           |
| Companies / employer jobs         | OK             |                                                                                           |
| Public job board + filters        | OK             |                                                                                           |
| Applications + pipeline           | OK             |                                                                                           |
| Express interest / contacts       | OK             |                                                                                           |
| Matching + /matches               | OK             |                                                                                           |
| Notifications in-app + email      | OK             | Resend + prefs                                                                            |
| Admin moderation                  | OK             | admin host                                                                                |
| Freelance tasks + proposals       | PARTIAL        | A3.1–A3.3 локально; разрешение на 0071–0073 и deploy получено; ждёт Supabase MCP по D438  |
| Bot web chat                      | PARTIAL        | нужен OpenRouter/бюджет                                                                   |
| Telegram bot webhook              | PARTIAL        | вебхук чинили; phone Mini App OPEN                                                        |
| Phone Mini App session            | PARTIAL / OPEN | [OPEN_TASKS](../OPEN_TASKS.md)                                                            |
| Cross-device email handoff (D328) | DEFERRED       | не итерировать                                                                            |
| Live import (8B)                  | OUT            | нужен founder approval                                                                    |
| OAuth Google/X                    | BROKEN         | Google на production возвращает `oauth_unavailable` при Supabase Auth 402; X не проверен  |
| Creative tests (D457–D459)        | PARTIAL        | фазы A, B, C на сайте; перевода нет                                                       |
| Messenger                         | OUT            | V2                                                                                        |

Детали кода: [../how-it-works/INDEX.md](../how-it-works/INDEX.md).
