# Документация INTGETION JOB LIST

Канон для агентов (always-on): корневой [`../AGENTS.md`](../AGENTS.md).  
`CLAUDE.md` и `.cursor/rules/spec.mdc` только указывают на него.

Горячий путь сессии (≤ 3 файла после AGENTS.md):

1. [CURRENT.md](CURRENT.md) — что сейчас, что работает / нет
2. [OPEN_TASKS.md](OPEN_TASKS.md) — открытые хвосты
3. [tz/INDEX.md](tz/INDEX.md) — только файл нужного домена

Не читать целиком: монолит ТЗ, весь старый MISSION_LOG, весь DECISIONS.

## Карта

| Файл / папка | Зачем |
| ------------ | ----- |
| [CURRENT.md](CURRENT.md) | Состояние «сейчас», worktree, следующий шаг |
| [OPEN_TASKS.md](OPEN_TASKS.md) | Незакрытые задачи вне roadmap |
| [tz/](tz/INDEX.md) | Живое ТЗ по доменам |
| [how-it-works/](how-it-works/INDEX.md) | Как устроено в коде + пути к файлам |
| [status/](status/INDEX.md) | OK / PARTIAL / BROKEN / DEFERRED |
| [DECISIONS.md](DECISIONS.md) | Новые D + таблица D1–D30; старые → archive |
| [ERD.md](ERD.md) | Схема БД |
| [RUNBOOK.md](RUNBOOK.md) | Эксплуатация, env, cron |
| [PARALLEL_WORK.md](PARALLEL_WORK.md) | Worktree / ветки агентов |
| [DESIGN.md](DESIGN.md) | UI-фундамент |
| [ADMIN.md](ADMIN.md) | Админка |
| [archive/](archive/INDEX.md) | Замороженные монолиты и старые логи |
| [TZ_INTGETION_v6.md](TZ_INTGETION_v6.md) | Stub-указатель (монолит в archive) |
| [../MISSION_LOG.md](../MISSION_LOG.md) | Хвост сессий; старше → archive/mission-log |

## Правило

ТЗ домена = требования. `how-it-works` = факт в коде. `status` = работает ли. Не дублировать простыни между ними — только ссылки.
