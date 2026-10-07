# Status — что работает

Легенда: **OK** · **PARTIAL** · **BROKEN** · **DEFERRED** · **OUT** (не MVP).

Обновлять вместе с [../CURRENT.md](../CURRENT.md).

| Зона | Статус | Заметка |
| ---- | ------ | ------- |
| Auth password / magic link | OK | Supabase; Site URL = prod |
| Auth emails (Supabase templates) | PARTIAL | Зависит от dashboard/hook; сверять прод |
| Register / login UI | OK | Social marks = stubs |
| Candidate profile | OK | |
| Companies / employer jobs | OK | |
| Public job board + filters | OK | |
| Applications + pipeline | OK | |
| Express interest / contacts | OK | |
| Matching + /matches | OK | |
| Notifications in-app + email | OK | Resend + prefs |
| Admin moderation | OK | admin host |
| Bot web chat | PARTIAL | нужен OpenRouter/бюджет |
| Telegram bot webhook | PARTIAL | вебхук чинили; phone Mini App OPEN |
| Phone Mini App session | PARTIAL / OPEN | [OPEN_TASKS](../OPEN_TASKS.md) |
| Cross-device email handoff (D328) | DEFERRED | не итерировать |
| Live import (8B) | OUT | нужен founder approval |
| OAuth Google/X | OUT | V2 |
| Messenger | OUT | V2 |

Детали кода: [../how-it-works/INDEX.md](../how-it-works/INDEX.md).
