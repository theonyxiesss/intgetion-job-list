# Документация INTGETION JOB LIST

Канон для агентов (always-on): корневой [`../AGENTS.md`](../AGENTS.md).  
`CLAUDE.md` и `.cursor/rules/spec.mdc` только указывают на него.

Горячий путь сессии (≤ 3 файла после AGENTS.md):

1. [CURRENT.md](CURRENT.md) — что сейчас, что работает / нет
2. [OPEN_TASKS.md](OPEN_TASKS.md) — открытые хвосты
3. [tz/INDEX.md](tz/INDEX.md) — только файл нужного домена

Не читать целиком: монолит ТЗ, весь старый MISSION_LOG, весь DECISIONS.

## Карта

| Файл / папка                                             | Зачем                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [CURRENT.md](CURRENT.md)                                 | Состояние «сейчас», worktree, следующий шаг                                                        |
| [OPEN_TASKS.md](OPEN_TASKS.md)                           | Незакрытые задачи вне roadmap                                                                      |
| [tz/](tz/INDEX.md)                                       | Живое ТЗ по доменам                                                                                |
| [how-it-works/](how-it-works/INDEX.md)                   | Как устроено в коде + пути к файлам                                                                |
| [status/](status/INDEX.md)                               | OK / PARTIAL / BROKEN / DEFERRED                                                                   |
| [DECISIONS.md](DECISIONS.md)                             | Новые D + таблица D1–D30; старые → archive                                                         |
| [ERD.md](ERD.md)                                         | Схема БД                                                                                           |
| [RUNBOOK.md](RUNBOOK.md)                                 | Эксплуатация, env, cron                                                                            |
| [PARALLEL_WORK.md](PARALLEL_WORK.md)                     | Worktree / ветки агентов                                                                           |
| [DESIGN.md](DESIGN.md)                                   | UI-фундамент                                                                                       |
| [REFERENCE_SOLUTIONS.md](REFERENCE_SOLUTIONS.md)         | Как сравнить свои модули с готовыми решениями перед новым элементом; REA и контекст агента         |
| [JOB_DASHBOARD_BENCHMARK.md](JOB_DASHBOARD_BENCHMARK.md) | Сравнение кабинетов вакансий с LinkedIn, Indeed, Ashby и открытым ATS; разрывы и кандидаты решений |
| [DB_PLATFORM_COMPARISON.md](DB_PLATFORM_COMPARISON.md)   | Supabase, Cloudflare D1 и Neon: тарифы, совместимость с проектом, когда нужна оплата               |
| [ERROR_DIAGNOSTICS.md](ERROR_DIAGNOSTICS.md)             | Навык отладки, готовые решения и схема понятных ошибок для API, БД и интерфейса                    |
| [UGC_MARKET_BENCHMARK.md](UGC_MARKET_BENCHMARK.md)       | UGC: сравнение Insense, Billo, JoinBrands, Collabstr с архитектурой и сценариями INTGETION         |
| [ADMIN.md](ADMIN.md)                                     | Админка                                                                                            |
| [MCP.md](MCP.md)                                         | MCP-сервер для внешних ИИ-ассистентов: план и фазы (D480–D486)                                     |
| [security/AUDIT_LOG.md](security/AUDIT_LOG.md)           | Журнал проверок безопасности: что проверено, на каком коммите, находки                             |
| [archive/](archive/INDEX.md)                             | Замороженные монолиты и старые логи                                                                |
| [TZ_INTGETION_v6.md](TZ_INTGETION_v6.md)                 | Stub-указатель (монолит в archive)                                                                 |
| [../MISSION_LOG.md](../MISSION_LOG.md)                   | Хвост сессий; старше → archive/mission-log                                                         |

## Правило

ТЗ домена = требования. `how-it-works` = факт в коде. `status` = работает ли. Не дублировать простыни между ними — только ссылки.
