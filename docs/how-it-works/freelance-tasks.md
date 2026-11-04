# Задачи фриланса — как устроено

Часть модуля `src/modules/freelance` (услуги и заказы — [freelance.md](freelance.md)). ТЗ: [47-freelance-tasks.md](../tz/47-freelance-tasks.md), приглашения — [49-freelance-invites-record-deadline.md](../tz/49-freelance-invites-record-deadline.md).

## Что делает

Заказчик публикует задачу. Она ждёт модератора, потом видна в разделе `/freelance/tasks`. Исполнители присылают отклики с ценой, сроком и текстом. Заказчик может пригласить подходящего исполнителя (A4). Когда заказчик нанимает, в одной транзакции создаётся заказ в статусе `accepted` с ценой и сроком отклика, задача становится `hired`, остальные ждущие отклики отклоняются (D569). Дальше это обычный заказ фриланса. Открытые задачи старше 30 дней закрываются кроном.

## Главные файлы

| Что                               | Где                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Вход                              | `src/modules/freelance/service/index.ts`                                                                          |
| Задачи и отклики                  | `service/task-service.ts` (`createTask`, `sendProposal`, `acceptProposal`, `closeTask`)                           |
| Правила задачи                    | `service/task-rules.ts`                                                                                           |
| SQL                               | `repo/task-repo.ts`, `repo/task-invite-repo.ts`                                                                   |
| Приглашения и подбор исполнителей | `service/task-invite-service.ts` (`inviteSeller`, `suggestSellers`, `rankSuggestions`)                            |
| Интерфейс                         | `ui/task-create-form.tsx`, `ui/task-proposal-form.tsx`, `ui/task-management-actions.tsx`, `ui/invite-sellers.tsx` |
| Spoki                             | `find_freelance_tasks`, `send_task_proposal` в `service/bot-tools.ts` (отклик — через карточку подтверждения)     |

## Таблицы и миграции

| Таблица                                  | Миграция                          |
| ---------------------------------------- | --------------------------------- |
| `freelance_tasks`, `freelance_proposals` | `0073_freelance_tasks.sql`        |
| `freelance_task_invites`                 | `0084_freelance_task_invites.sql` |

По MISSION_LOG `0073` и `0084` применены к облаку 2026-10-29 (D438). До миграции код отвечает пусто (`expireOldTasks` возвращает 0).

## Маршруты и страницы

- Страницы: `/freelance/tasks`, `/freelance/tasks/[id]`, `/freelance/tasks/new`, `/freelance/tasks/mine` (блок «Подходящие исполнители»).
- API: `/api/freelance/tasks`, `/api/freelance/tasks/[id]`, `POST /api/freelance/tasks/[id]/invite`, `/api/freelance/proposals`, `/api/freelance/proposals/[id]`.
- Модерация: `getTasksForModeration`, `decideTaskModeration` (очередь `/admin/moderation`).
- Cron: `expireOldTasks` в `/api/cron/freelance` (каждые 15 минут).
- Sitemap: `listTaskSitemapEntries`.

## Env

Своих переменных нет.

## Решения

D569 (раздел задач, одна правка при найме), D576 (приглашение A4, пороги значков по умолчанию).

## Что не сделано

- Экраны под входом не проверялись: локально нет вошедшей сессии, на сайте вход блокирует квота Supabase Auth (402).
- `docs/status/INDEX.md` и `OPEN_TASKS.md` ещё пишут, что `0071`–`0073` не применены; MISSION_LOG от 2026-10-29 говорит, что применены. Статусы надо обновить.
