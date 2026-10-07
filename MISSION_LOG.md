# MISSION_LOG

> Older entries: [docs/archive/mission-log/](docs/archive/mission-log/) — see [docs/archive/INDEX.md](docs/archive/INDEX.md).
> Session protocol: [docs/tz/00-protocol.md](docs/tz/00-protocol.md). Status now: [docs/CURRENT.md](docs/CURRENT.md).

## [2026-10-07] — канал Jobs Alert — DONE (код, не прод)

- Сделано: новая опубликованная вакансия уходит в канал Jobs Alert фиксированным текстом (название, компания, зарплата, ссылка) из cron `/api/cron/telegram` после личной рассылки. Без LLM. Метка `jobs_alert_sent_at` только после успешной отправки. Старые вакансии не догоняются. На intgetion.com источник Remotive не постится. Пустой chat id выключает только этот шаг.
- Команды проверки: `pnpm exec tsc --noEmit` → 0. eslint по новым файлам → 0. `vitest` jobs-alert → 11 passed.
- Миграции: `src/db/migrations/0033_jobs_alert.sql`. На облако не применялась.
- Изменённые файлы: `src/modules/jobs/service/jobs-alert.ts`, cron telegram, схема jobs, тесты, `scripts/env-rules.mjs`.
- Отклонения от ТЗ: `app_rw` получает чтение одной строки `schema_migrations` (имя этой миграции), иначе водяной знак из cron не виден.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. Перед выкладкой — миграция на облако и `JOBS_ALERT_CHAT_ID` в Vercel.

## [2026-10-07] — ручная привязка в Supabase — DONE

- Сделано: в облачном проекте `intgetion-dev` включён «Allow manual linking». В `supabase/config.toml` `enable_manual_linking = true`. «Привязать Google» с локального сайта открывает выбор аккаунта Google и возвращает на `/{locale}/auth/callback?next=account`. Провайдер X не включался: клиента OAuth 2.0 нет (D336).
- Команды проверки: браузер — `GET /api/auth/google?locale=ru&link=1` открыл `accounts.google.com` (приложение INTGETION JOB LIST), не `oauth_unavailable`.
- Миграции: нет.
- Изменённые файлы: `supabase/config.toml`, `docs/DECISIONS.md`, `docs/OPEN_TASKS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: нет (D339).
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде основателя. X заработает после клиента в портале разработчика.

## [2026-10-07] — привязка аккаунтов и одно согласие — DONE

- Сделано: в «Настройки → Аккаунт → Способы входа» можно привязать и отвязать Telegram, Google и X. Google и X идут через `linkIdentity` и возвращают на эту страницу. Последнюю identity отвязать нельзя. Telegram при выключенном виджете привязывается ботом, без новой сессии. На входе и регистрации текст согласия один, внизу блока: «Продолжая, вы принимаете…».
- Команды проверки: `pnpm exec tsc --noEmit` → 0. eslint по затронутым файлам → 0. `vitest` auth-service и telegram → 55 passed. Браузер на `:3000`: `/ru/login` и `/ru/register` — одна строка «Продолжая, вы принимаете…», «Продолжая через» нет. `/ru/settings/account` — Telegram «Привязать», Google «Отвязать» (уже привязан), X ссылка `/api/auth/x?locale=ru&link=1`.
- Миграции: нет.
- Изменённые файлы: `src/components/settings/sign-in-methods.tsx`, `src/app/[locale]/settings/account/page.tsx`, `src/components/auth/social-sign-in-stubs.tsx`, `src/components/auth/telegram-login-button.tsx`, `src/modules/auth/service/auth-service.ts`, `telegram-login.ts`, маршруты `oauth/unlink` и `telegram/link`, callback, `src/messages/{en,ru}.json`.
- Отклонения от ТЗ: привязка OAuth поверх D7 (OAuth был V2) — D339, в том же духе, что D335 и D336.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде основателя.

## [2026-10-07] — сборка и выкладка — DONE

- Сделано: локальные наработки собраны с `origin/master` и выложены на https://intgetion.com. В проде: Google и X на входе, кнопка Telegram, растущее поле чата, тип аккаунта, письма D330, плюс уже бывшие на master логотип, цены и D325–D329. X-провайдер в Supabase по-прежнему выключен.
- Команды проверки: `pnpm exec tsc --noEmit` → 0. `vitest` auth-service, schemas, email-html → 48 passed. Прод `d914274` READY. `https://intgetion.com/ru/login` содержит `/api/auth/google`, `/api/auth/x`, Telegram и `/pricing`.
- Миграции: `0031_account_type.sql` уже была на облаке до этой выкладки.
- Изменённые файлы: ветка `feat/email-system-design`, merge в master, PR #12.
- Отклонения от ТЗ: запись про Spoki перенумерована в D337, потому что D324 на master — Mini App.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде основателя. X заработает после клиента в портале разработчика.

## [2026-10-07] — Spoki composer like a chat — DONE
- Сделано: поле снизу чата. Пустое — одна строка 44 px. Две и три строки выше, низ поля на месте. С шести строк высота 160 px и дальше не растёт: длинный текст скроллится внутри. Лента скроллится отдельно, страница не растёт. Enter отправляет и возвращает поле к одной строке, фокус остаётся. Shift+Enter переносит строку. Клавиатура по-прежнему сжимает страницу (D287).
- Команды проверки: eslint → 0. Chrome на `:3000`, 1280×800 и 390×700: пусто 44, одна 44, две 60, три 80, длинный текст 160 при scrollHeight 840, низ поля не сдвинулся, высота ленты та же. После Enter поле 44, пустое, в фокусе. Установленное PWA не ставилось: та же страница.
- Миграции: нет.
- Изменённые файлы: `src/components/bot/chat.tsx`, `tests/e2e/chat.spec.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: D334 отменяет D333.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде.

## [2026-10-07] — Spoki composer fixed — DONE
- Сделано: поле чата снова всегда 44 px. Рост по `scrollHeight` убран. Длинный текст и Shift+Enter прокручиваются внутри. Enter отправляет. Общий textarea форм не трогался.
- Команды проверки: eslint → 0. Chrome на `:3000`, 1280 и 390: 1 символ, 1 строка, 10 и 100 строк — высота 44 px, `min`/`max` тоже 44, `overflow-y: auto`, `scrollHeight` 2040 при видимых 42. Лента не меняла высоту. Enter очистил поле, высота осталась 44. Установленное PWA не ставилось: это та же страница.
- Миграции: нет.
- Изменённые файлы: `src/components/bot/chat.tsx`, `src/components/ui/input.tsx`, `tests/e2e/chat.spec.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: D333 отменяет рост из D332.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде.

## [2026-10-07] — Spoki composer cap — DONE
- Сделано: поле чата растёт от 44 px до `min(7.5rem, 30dvh)`, дальше высота стоит, текст прокручивается внутри. Низ поля не сдвигается. Enter отправляет, Shift+Enter переносит строку. Общий textarea форм не изменил высоту.
- Команды проверки: eslint → 0. Chrome на `:3000`: 1280 и 390 — одна строка 44 px, три строки 80 px, длинный текст 120 px при `scrollHeight` больше поля, `overflow-y: auto`, ширина ленты та же. Enter отправил 8 строк и вернул поле к 44 px.
- Миграции: нет.
- Изменённые файлы: `src/components/ui/input.tsx`, `src/components/bot/chat.tsx`, `tests/e2e/chat.spec.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: D332 уточняет D331.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде.

## [2026-10-07] — Spoki chat layout — DONE
- Сделано: `/chat` — колонка на весь экран, лента сама скроллится, поле одной строки 44 px. Длинный текст прокручивается внутри, ручки растягивания нет. Кнопка отправки — иконка внутри поля. Карточки вакансий и разовые кнопки аккаунта остались над полем. Подвал на этой странице скрыт.
- Команды проверки: `pnpm exec eslint` по `chat.tsx` и странице чата → 0. Playwright Chromium в среде не установлен. Замер через установленный Chrome на `http://127.0.0.1:3000/en/chat`: 1280×800 и 390×800, высота поля 44 px до и после длинной вставки, `resize: none`, заголовок Spoki Assistant виден, лента выше поля, поле у нижнего края.
- P-тесты подфазы: `tests/e2e/chat.spec.ts` — сценарий высоты поля добавлен, локально не прогнан (нет браузера Playwright).
- Миграции: нет.
- Изменённые файлы: `src/components/bot/chat.tsx`, `src/app/[locale]/chat/page.tsx`, `src/app/globals.css`, `tests/e2e/chat.spec.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: D331. Общий textarea форм не менялся.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде.

## [2026-10-07] — Spoki memory — DONE
- Сделано: веб-чат ведёт Spoki Assistant. Ответ вроде «В Италии» пишется в `bot_conversations.state.draft.country` (`IT`) на любом LLM, известные поля не переспрашиваются, пустой ответ модели заменяется следующим вопросом. Гость после страны или роли видит одну кнопку «Создать аккаунт»; регистрация с `next=chat` возвращает в тот же диалог. «Пусть Spoki заполнит» пишет allowlist профиля без карточки на каждое поле; отклик по-прежнему с карточкой. В шапке одна кнопка «Войти» на всех ширинах; magic link — ссылка под формой. Отдельного PWA-входа нет.
- Команды проверки: `pnpm exec tsc --noEmit` → 0. `pnpm exec eslint` по затронутым файлам → 0. `pnpm exec vitest run` на memory/extract/tools/auth-service/llm/messages → 72 passed. `pnpm exec vitest run --config vitest.integration.config.mts src/modules/bot/bot.integration.test.ts` → не запущен против БД: `DATABASE_URL` в этой среде не loopback, тест сам отказался. Браузерный инструмент недоступен. HTML уже запущенного `next dev` на `:3000`: `/en/chat` отдаёт заголовок Spoki Assistant и пустую фразу без чипов; `/en/login` — одна кнопка входа, ссылка Email link, «No account? Register», без легенды способа входа и без кнопок Google/X/Telegram. Узкое окно и установленное PWA не открывались: это тот же HTML, кнопка «Войти» в шапке скрыта ниже `sm` и остаётся в меню.
- P-тесты подфазы: `src/modules/bot/__tests__/memory.test.ts` (Италия, длинная реплика, промпт). Интеграционный сценарий добавлен в `bot.integration.test.ts`, локально не прогнан.
- Миграции: нет.
- Изменённые файлы: `src/modules/bot/**`, `src/components/bot/chat.tsx`, `src/components/auth/login-form.tsx`, `src/components/auth/register-form.tsx`, `src/components/shell/header.tsx`, `src/app/api/bot/fill/route.ts`, `src/app/api/bot/conversation/route.ts`, `src/app/[locale]/login/page.tsx`, `src/app/[locale]/register/page.tsx`, `src/app/[locale]/auth/callback/route.ts`, `src/modules/auth/**`, `src/lib/llm/provider.ts`, `src/messages/{en,ru}.json`, `tests/e2e/{auth,chat}.spec.ts`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`.
- Отклонения от ТЗ: D324. Страна не становится жёстким фильтром поиска, если в черновике удалёнка. Лимиты D323 не менялись.
- OPEN QUESTION: нет.
- Следующая подфаза: только по явной команде. Телефонный Mini App не трогался.

## [2026-10-05] — P-MOBILE — на ветке cursor/p-mobile

- Сделано: e2e на 360 и 390 для главной, каталога, вакансии, зарплат, входа и чата (без горизонтальной прокрутки, зоны нажатия кнопок и полей ≥ 44 px, axe без critical и serious). Нижнее меню кандидата проверено на 360. Чат на телефоне занимает экран между шапкой и меню, поле ввода не уезжает под клавиатуру (`interactive-widget: resizes-content`). В `scripts/ci-ui.sh` мобильный Lighthouse каталога и вакансии, медиана пяти прогонов, потолок 4000 мс (D288). «Не указано» в телеметрии красится `--fg-muted` (D286): `#71717A` на чёрном — 4.35:1.
- Команды проверки: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37372773588 — `check` и `database` success, head `665c0a9`. Lighthouse: главная медиана 1898 мс (2650, 1898, 1874, 1876, 1916); каталог 2749 мс; вакансия 1868 мс. Потолок каталога и вакансии снижен до 4000 мс. Ранние прогоны: `37363382897` контраст, `37365038039` радиокнопки, `37365887816` Chrome и отмены раннера.
- P-тесты подфазы: phone.spec.ts, правка mobile-app.spec.ts.
- Миграции: нет.
- Изменённые файлы: `src/components/bot/chat.tsx`, `src/app/[locale]/chat/page.tsx`, `src/app/[locale]/chat/layout.tsx`, `src/app/globals.css`, `tests/e2e/phone.spec.ts`, `tests/e2e/mobile-app.spec.ts`, `scripts/ci-ui.sh`, `docs/DECISIONS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: D285–D288. `scripts/ci-ui.sh` обычно меняет только Claude Code; правка здесь, потому что задание прямо кладёт туда замер.
- OPEN QUESTION: нет. Потолок 4000 мс держит измеренные медианы с запасом на медленный раннер.
- Следующая подфаза: Claude Code вливает после зелёного CI. В master не вливалось.

## [2026-10-06] — P-MOBILE Cursor влит в пачку — на ветке claude/integrate-seo2

- Сделано: пять коммитов `cursor/p-mobile` перенесены на `08b8456` (D285–D288): телефонные проверки в e2e (`tests/e2e/phone.spec.ts`), чат на телефоне на весь экран, зона нажатия 44 px у выбора способа входа, приглушённый цвет для отсутствующей телеметрии, мобильный Lighthouse каталога и вакансии с потолком 4000 мс и повтор прогона, когда Chrome не успевает поднять порт отладки.
- Повтор Lighthouse закрывает ту самую флаку, из-за которой у нас сегодня краснели `claude/organic` и D302: «waiting for dynamic debugging port».
- Конфликты: только `MISSION_LOG.md` и `docs/DECISIONS.md` (append-only), обе стороны сохранены. Решения Cursor D285–D288 легли в конец файла — он ведётся в порядке вливания, а не по номерам.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 659 passed. Паритет `en.json` / `ru.json` — 1223 ключа с обеих сторон. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D285–D288 (Cursor).
- Следующее: зелёный CI → ff master, затем `cursor/admin-a2` с миграцией 0029.

## [2026-10-05] — A2 — на ветке cursor/admin-a2

- Сделано: списки и карточки людей, компаний и вакансий. Почта, телефон и Telegram на карточке в маске; «Показать» только с правом `users.pii.read` и причиной, в аудит пишется `pii.read`. Приостановка, завершение сессий и сброс пароля — сразу. Бан и удаление — запрос на 24 часа, подтверждает второй администратор; свой запрос отвечает 422 `FOUR_EYES`. Заметки только добавляются. Бан пишет хэш почты и Telegram id в `blocklist` и ставит статус `banned`; вход уже отклоняет любой статус кроме `active`.
- Команды проверки: `pnpm exec tsc --noEmit` → 0. eslint по файлам A2 → 0. `pnpm exec vitest run src/modules/admin-console/service/people-service.test.ts src/messages/messages.test.ts` → 0 (2 файла, 5 тестов). `gh run watch 37377974818` → 0: https://github.com/theonyxiesss/intgetion-job-list/actions/runs/37377974818 — jobs `check` и `database` success, head `bf7028c`. Миграция на облако не применялась.
- P-тесты подфазы: e2e каждого действия, отказа без права, строк аудита, входа забаненного и запрета подтвердить свой запрос.
- Миграции: `src/db/migrations/0029_admin_people.sql` (в репозитории, не на облаке).
- Изменённые файлы: миграция 0029, `src/db/schema/admin-people.ts`, `src/db/schema/enums.ts`, `src/modules/admin-console/people-repo.ts`, `src/modules/admin-console/service/people-service.ts`, маршруты `api/admin/users/[id]/*` и `api/admin/approvals/[id]`, страницы users/companies/jobs, `src/admin/registry.ts`, `src/components/admin/people-actions.tsx`, `src/lib/supabase/admin.ts`, сообщения en/ru, `tests/e2e/admin-a2.spec.ts`, `docs/DECISIONS.md`.
- Отклонения от ТЗ: D304–D310 (номера перенумерованы при вливании: D293–D299 уже заняты). Карточки компании и вакансии только для чтения (D310).
- OPEN QUESTION: повторная регистрация после удаления. `registrationBlocked` уже есть, но `src/modules/auth/**` в этой задаче менять нельзя. Нужны два вызова, их добавит Claude в том же слиянии: в `register()` до `signUp` / `signInWithOtp` — если `registrationBlocked({ email })`, вернуть тот же ответ, что и при существующей почте; в `signInWithTelegramProfile`, когда привязки ещё нет, до `createConfirmedAuthUser` — если `registrationBlocked({ telegramId: String(telegram.id) })`, бросить `telegramFailed()`. Бан и приостановка существующего аккаунта вход уже закрывают без этих правок. Рекомендация: влить оба вызова вместе с A2, не откладывать.
- Следующая подфаза: Claude Code вливает после зелёного CI. В master не вливалось.

## [2026-10-06] — A2 Cursor влит в пачку — на ветке claude/integrate-seo2

- Сделано: два коммита `cursor/admin-a2` перенесены поверх P-MOBILE. Списки и карточки людей, компаний и вакансий в админке, контакты в маске до указания причины, бан и удаление в четыре глаза, заметки только на добавление, блок-лист против повторной регистрации.
- Перенумерация: Cursor занял D293–D299, но эти номера уже заняты моими решениями (отчёт «откуда приходят», подборки, FAQ, картинки, подтверждение сайта, тексты). Его решения перенумерованы в D304–D310 — в `docs/DECISIONS.md`, в заголовке миграции `0029_admin_people.sql`, в комментариях `src/db/schema/admin-people.ts` и `src/modules/admin-console/service/people-service.ts` и в его записи журнала.
- Миграции: `0029_admin_people.sql` применена к облачной базе ДО вливания: `pnpm db:migrate` → applied, `pnpm db:verify` → `app_rw exists; RLS deny-all holds on 51 tables; audit_logs is append-only`.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests scripts` → 0, `pnpm exec vitest run` → 663 passed. Паритет `en.json` / `ru.json` — 1255 ключей с обеих сторон. Предупреждения prettier по файлам Cursor — только переводы строк: те же файлы с LF проходят `--check` чисто, в его CI `format:check` был зелёный.
- Решения: D304–D310 (Cursor, перенумерованы).
- Следующее: зелёный CI → ff master, затем разбор веток Hermes.

## [2026-10-06] — агент в Telegram-боте и дизайн вкладки агента — на ветке claude/tg-agent

- Сделано: D311 — бот отвечает агентом на обычные сообщения. Вебхук сначала пробует шаг входа (`handleTelegramWebhook` теперь возвращает, взял ли он обновление), остальное идёт в `handleTelegramAgentUpdate` (`src/modules/bot/service/telegram-agent.ts`). Нить разговора выводится из id чата через HMAC с `PRIVACY_HASH_SECRET` — ни таблицы, ни миграции. Команды `/help` и `/reset`, индикатор «печатает», ответы на языке Telegram-аккаунта, вакансии ссылками на наши страницы, запрос подтверждения на запись уводит на сайт. Гость без привязки тоже может спрашивать, лимит считается по `tg:<chat>`.
- Сделано: D312 — вкладка агента переписана. Починен настоящий баг: токены стрима добавлялись отдельными сообщениями, ответ рассыпался на десятки кусков с подписью «Агент» у каждого; теперь дописываются в один ответ. Пустой экран получил три примера вопросов кнопками, появился индикатор «Думает…», вопрос справа в рамке, ответ слева без рамки, у карточки вакансии процент совпадения и до трёх строк объяснения; на телефоне подпись кнопки отправки прячется.
- Проверка в браузере (dev, порт 3400): пустой экран с примерами, отправка вопроса, подставной SSE-ответ собрался в один пузырь, карточки вакансий с «82% MATCH» на месте; телефон 375×812 — чат на весь экран, примеры в столбик. Живой агент не отвечает: `ANTHROPIC_API_KEY` нет ни локально, ни на проде — прод отдаёт `BOT_UNAVAILABLE`.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src` → 0, `pnpm exec vitest run` → 670 passed (7 новых тестов на бота), `pnpm build` → 0. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D311, D312. RUNBOOK: раздел 14 — что нужно, чтобы агент заговорил, и как прикрепить сайт к боту через BotFather.
- OPEN QUESTION: вход через Telegram возвращать не пришлось — он работает на проде, `/api/auth/telegram/start` отдаёт ссылку `t.me/intgetion_bot?start=login_…`. Старый виджет под флагом `TELEGRAM_LOGIN_ENABLED` остаётся выключенным: новый вход через бота его заменил.
- Следующее: зелёный CI → ff master. Основателю: `ANTHROPIC_API_KEY` и `LLM_PRICES_MICRO_USD` в Vercel, иначе агент молчит везде.

## [2026-10-06] — вебхук Telegram не доходил до маршрута — DONE на ветке claude/webhook-origin

- Найдено при проверке прода после вливания агента: `POST https://intgetion.com/api/telegram/webhook` отвечал `403 {"error":{"code":"FORBIDDEN","message":"Cross-origin request"}}`. Причина — проверка CSRF в `src/proxy.ts`: она отклоняет любой изменяющий запрос без `Origin`, а Telegram его не шлёт. Бот не работал вообще: ни подтверждение входа (D256–D258), ни новый агент (D311).
- Сделано: D313. `needsOriginCheck` в `src/lib/origin.ts` выводит ровно один путь `/api/telegram/webhook` из-под правила; маршрут по-прежнему проверяет `x-telegram-bot-api-secret-token` и без токена бота отвечает 404.
- Проверка локально (dev, порт 3400): вебхук без `Origin` → 404 (нет токена в `.env.local`), то есть дошёл до маршрута; `POST /api/bot/message` без `Origin` → 403, как и было.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 672 passed (2 новых теста на список исключений). Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Новый e2e в `tests/e2e/chat.spec.ts`: вебхук без `Origin` не должен отвечать 403, а обычный API без `Origin` — должен.
- Миграции: нет. Решения: D313.
- OPEN QUESTION: после вливания основателю стоит проверить вход через Telegram вживую — до этой правки он не мог сработать ни разу.

## [2026-10-06] — сессия: проверка и закрытие куки от скриптов — на ветке claude/session-keep

- Проверено по коду: куки Supabase живут 400 дней (умолчание библиотеки), прокси обновляет истёкший токен перед отрисовкой (`getClaims` → `getSession` → `_callRefreshToken`), куки разговора с агентом — 30 дней, `HttpOnly`, `SameSite=Lax`. То есть сессия и так сохранялась.
- Найдено попутно: Supabase пишет куки сессии с `httpOnly: false` — их может прочитать любой скрипт на странице. Браузерного клиента Supabase в проекте нет вообще (все вызовы серверные), поэтому куки закрыты: `authCookieOptions` в `src/lib/supabase/cookie-options.ts`, применён и в серверном клиенте, и в обновлении сессии в прокси. Решение D314.
- Новые e2e: после входа у каждой куки `sb-*` проверяются срок (не куки на время окна), `HttpOnly` и `SameSite`; затем вход переживает перезагрузку, переход на другую страницу, вторую вкладку и новый контекст браузера с теми же куками. Отдельно — что разговор гостя с агентом возвращается после перезагрузки.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 674 passed (2 новых теста на правила куки). Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D314.
- OPEN QUESTION: срок жизни refresh-токена и «выход при бездействии» задаются в панели Supabase, а не в коде. Если основателя выкидывало, стоит посмотреть там; в коде ограничений нет.
- Следующее: зелёный CI → ff master. Новые e2e и есть настоящая проверка: они выполняют вход по-настоящему.

## [2026-10-06] — сессия в окне Mini App — на ветке claude/session-frame

- Проверено по данным облачной базы: `auth.sessions` — одна живая сессия от 2026-10-05, `not_after` пустой (ограничения по времени нет), `auth.refresh_tokens` — один токен, не отозван. То есть сервер сессии не убивает, и выхода «сам по себе» на сайте нет.
- Найдено единственное место, где выход при перезаходе реален: Mini App на Telegram Web — это сайт в чужом фрейме, а куку `SameSite=Lax` браузер там не сохраняет вовсе. С включённым Mini App человек выглядел бы вышедшим при каждом открытии.
- Сделано: D315. Во фрейме сессия пишется как `SameSite=None; Secure; Partitioned`; без https послабление не включается. «Во фрейме» определяется по `Sec-Fetch-Dest: iframe` или по метке `tg_frame`, которую ставит маршрут входа в Mini App. Обычный сайт остаётся на `Lax`.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 678 passed (4 новых теста), `pnpm build` → 0. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D315.
- OPEN QUESTION: вживую это проверяется только внутри Telegram Web после включения `TELEGRAM_MINI_APP_ENABLED` и настройки кнопки меню в BotFather. Локально сценарий не воспроизвести: `SameSite=None` требует https.
- Следующее: зелёный CI → ff master.

## [2026-10-06] — переход из Mini App в своё приложение — на ветке claude/session-frame

- Сделано: D316. Маршрут `/api/auth/handoff` отдаёт вошедшему одноразовый адрес входа в его же аккаунт (магическая ссылка Supabase, без новой таблицы и миграции), а полоса `MiniAppBar` во фрейме предлагает «Открыть в браузере» и «Привязать почту». Так человек заходит через Mini App, переходит в свой браузер уже с аккаунтом, ставит PWA и там привязывает почту.
- Исправлено по ходу: первая версия полосы жила внутри `TelegramMiniApp`, а тот рендерится только для невошедших — полоса исчезала бы сразу после входа. Теперь это отдельный компонент, и он показывается только когда человек вошёл и находится во фрейме.
- Проверка локально: запрос с `Sec-Fetch-Dest: iframe` отдаёт полосу (`<aside class="border-t border-line bg-surface …">`), обычный запрос — нет. Настоящий iframe с чужого адреса не открывается вовсе: CSP разрешает только `https://web.telegram.org` и `https://*.telegram.org` — то есть встроить сайт может лишь Telegram.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src tests` → 0, `pnpm exec vitest run` → 681 passed (3 новых теста на передачу сессии), `pnpm build` → 0, `prettier --check` по изменённым — чисто. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D315, D316.
- OPEN QUESTION: вживую проверяется только после включения `TELEGRAM_MINI_APP_ENABLED` и настройки кнопки меню в BotFather. Привязка почты уже существует (D230-D231) — полоса просто ведёт туда.
- Следующее: зелёный CI → ff master.

## [2026-10-06] — агент переведён на бесплатные модели OpenRouter — на ветке claude/openrouter-default

- Исправлено расхождение с договорённостью: провайдер по умолчанию был Anthropic, поэтому без платного ключа агент молчал. Теперь умолчание — OpenRouter, `LLM_PROVIDER=anthropic` остаётся запасным. Решение D317.
- Найден нерабочий дефолт: модель `qwen/qwen3.8-27b:free` в каталоге OpenRouter не существует. Запрос к `https://openrouter.ai/api/v1/models` (2026-10-06): 465 моделей, 16 бесплатных, 15 из них принимают инструменты. Новые умолчания выбраны оттуда: чат `nvidia/nemotron-3-super-120b-a12b:free` (262k контекста, tools + structured outputs), извлечение `google/gemma-4-26b-a4b-it:free`. Обе с нулевой ценой.
- Env: `OPENROUTER_API_KEY` стал обязательным для прода вместо `ANTHROPIC_API_KEY`, добавлена проверка формата ключа (`sk-or-…`). `.env.example` переписан: цены и модели можно не задавать вовсе.
- Документация приведена в соответствие: RUNBOOK (таблица переменных, ротация ключей, предзапусковый чек-лист, раздел 14), бриф Cursor.
- Команды проверки: `pnpm exec tsc --noEmit` → 0, `pnpm exec eslint src scripts` → 0, `pnpm exec vitest run` → 682 passed (тесты выбора провайдера и env-правил переписаны под новую договорённость), `pnpm build` → 0. Красный `legal.test.ts` — артефакт CRLF рабочей копии Windows.
- Миграции: нет. Решения: D317.
- OPEN QUESTION: у бесплатного уровня OpenRouter свои ограничения по частоте запросов. Если при живом ключе агент начнёт отвечать «попробуйте позже», причина скорее там; тогда вариант — платная модель подешевле с ценой в `LLM_PRICES_MICRO_USD`.
- Следующее: зелёный CI → ff master. Основателю: `OPENROUTER_API_KEY` в Vercel (prod), больше ничего не нужно.

## [2026-10-06] — Mini App вживую — NOT DONE (ветка `cursor/mini-app-live`)

- Сделано: D318. Кнопка «Открыть в браузере» больше не вызывает `window.open` после `await`: на компьютере окно резервируется в нажатии и только потом получает одноразовый адрес. В телефонном webview и в приложениях Telegram окно не открывается (ссылка сгорела бы внутри Telegram); если клиент отдал `Telegram.WebApp.openLink`, адрес уходит туда, иначе он показывается текстом и копируется. Чужой адрес, не наш `/auth/callback`, отбрасывается. Полоса остаётся в потоке страницы и на узком экране получает отступ `safe-area`, кнопки столбиком на всю ширину. В полосе одна строка, как поставить приложение на домашний экран. Подписанные данные по-прежнему берутся из фрагмента; если фрагмент уже стёрт, берётся копия с объекта клиента. Скрипт telegram.org не подключается.
- Живой прод, отдельно от кода: `curl -sI https://intgetion.com/en` → HTTP 200, `Content-Security-Policy` содержит `frame-ancestors 'none'`, есть `X-Frame-Options: DENY`. В Vercel-проекте `intgetion-job-list` ключа `TELEGRAM_MINI_APP_ENABLED` нет. Без него Telegram получает пустой фрейм. Telegram Web на компьютере открылся на экране входа по QR, сессии Telegram в этом браузере нет. Шаги 1–5 брифа (вход в Mini App, повторное открытие, полоса, телефон, PWA, почта, агент в боте) не выполнялись.
- Команды проверки: `pnpm exec eslint src tests scripts` → 0. `pnpm exec vitest run` → 689 passed, 1 skipped, 1 failed: `src/content/legal/legal.test.ts` — тот же артефакт CRLF рабочей копии Windows, файл не менялся. Новые тесты `src/components/auth/mini-app-open.test.ts` — 8 passed. Первый `pnpm build` → 1 из-за чужого устаревшего `.next/dev/types/validator.ts` (старые пути `src/app/[locale]/admin`, админка уже в `src/app/(admin)`); каталог `.next/dev` удалён, повтор `SWC_NATIVE_BINDING_CACHE=C:\Users\Admin\.swc-cache-cursor pnpm build` → 0, шаг TypeScript внутри сборки прошёл. `pnpm exec prettier --write` по своим файлам → 0.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/components/auth/mini-app-bar.tsx`, `src/components/auth/mini-app-open.ts`, `src/components/auth/mini-app-open.test.ts`, `src/components/auth/telegram-mini-app.tsx`, `src/messages/en.json`, `src/messages/ru.json`, `docs/DECISIONS.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: D318
- OPEN QUESTION: основателю включить `TELEGRAM_MINI_APP_ENABLED=true` в Vercel (production, проект `intgetion-job-list`) и передеплоить. Кнопка меню в BotFather по брифу уже настроена. Рекомендация: включить флаг и влить эту ветку, затем пройти шаги 1–5 на живом проде. Пока флага нет, писать «должно работать» нельзя. `ANTHROPIC_API_KEY` по-прежнему нет — ответ бота «агент недоступен» на этом шаге не поломка.
- Следующая подфаза: после флага и вливания — живая проверка Mini App. В master эта ветка не вливалась.

## [2026-10-06] — корень admin.intgetion.com — DONE

- Сделано: D319. `https://admin.intgetion.com/` отвечал 404, вход при этом открыт на `/en/admin/login`. Корень админ-хоста теперь 307 на этот вход. `/en` и `/en/jobs` на админ-хосте по-прежнему 404.
- Команды проверки: `pnpm exec vitest run src/admin/host.test.ts` → 0 (6 tests). Живой прод до выкладки: `curl -sI https://admin.intgetion.com/` → 404; `curl -sI https://admin.intgetion.com/en/admin/login` → 200.
- Миграции: нет. Решения: D319.

## [2026-10-06] — телефонный Mini App — на ветке cursor/mini-app-phone

- Сделано: D320. На компьютере Mini App — фрейм, сессия `Partitioned` сохраняется, человек сразу в кабинете. На телефоне то же окно — верхний документ webview, и эти куки не сохраняются, поэтому тот же аккаунт остаётся гостем. Вход теперь пишет обычную `SameSite=Lax` сессию, если страница не во фрейме. Метка визита на телефоне — `tg_app`, не `tg_frame`: иначе следующий запрос снова включил бы Partitioned. Полоса внизу показывается и по этой метке.
- Команды проверки: `pnpm exec vitest run src/components/auth/mini-app-open.test.ts src/lib/security.test.ts` → 0 (2 файла, 31 тест). eslint по этим файлам → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D320.
- OPEN QUESTION: нет. Живой телефон можно проверить только после выкладки этой ветки.

## [2026-10-06] — телефонный Mini App, вторая правка — на ветке cursor/mini-app-phone

- Сделано: D321. После D320 Desktop заходил, телефон — нет. Парсер фрагмента теперь как у Telegram (`#/путь?tgWebAppData=…`). `Partitioned` только для `web.telegram.org`; сервер больше не включает их по умолчанию. Вход несколько раз перечитывает данные в первые ~2 с.
- Команды проверки: `pnpm exec vitest run src/components/auth/mini-app-open.test.ts src/lib/security.test.ts` → 0 (2 файла, 31 тест). eslint → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D321.
- OPEN QUESTION: нет.

## [2026-10-06] — телефонный Mini App, третья правка — D322

- Сделано: корень `/` при Mini App больше не делает HTTP 307 на `/en` — отдаёт HTML с `location.replace`, чтобы `#tgWebAppData` не пропал на телефоне. Фрагмент дублируется в `sessionStorage`. Запасной URL `/tg.html` для BotFather. Маркер сессии пишется через `cookies().set`, чтобы не затереть куки Supabase.
- Команды проверки: `pnpm exec vitest run src/components/auth/mini-app-open.test.ts src/lib/security.test.ts` → 0 (2 файла, 31 тест). eslint → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D322.
- OPEN QUESTION: в BotFather лучше `https://intgetion.com/tg.html` или `/en`, не голый домен. Рекомендация: `tg.html`.


## [2026-10-07] — docs-reorg — DONE

- Сделано: короткий контекст для агентов. Горячий путь: `docs/README.md` → `docs/CURRENT.md` → `docs/OPEN_TASKS.md` → один `docs/tz/<domain>.md`. Монолит ТЗ заморожен в `docs/archive/tz/TZ_INTGETION_v6.md`, stub в `docs/TZ_INTGETION_v6.md`. Нарезаны domain TZ, `how-it-works/`, `status/`, `archive/INDEX`. `MISSION_LOG`: хвост 15 записей в корне, старше → `docs/archive/mission-log/2026-10-early.md`. `DECISIONS`: D1–D30 + оглавление + хвост D301+; диапазоны D31–D300 в `docs/archive/decisions/`. Обновлены `.cursor/rules/spec.mdc` и `AGENTS.md`.
- Команды проверки: `node scripts/docs-reorg.mjs` → 0 (нарезка/архив). Ручная сверка: есть `docs/tz/INDEX.md`, `docs/CURRENT.md`, `docs/archive/INDEX.md`.
- P-тесты подфазы: нет (только docs).
- Миграции: нет.
- Изменённые файлы: `docs/README.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `docs/TZ_INTGETION_v6.md` (stub), `docs/tz/*`, `docs/how-it-works/*`, `docs/status/INDEX.md`, `docs/archive/**`, `docs/DECISIONS.md`, `MISSION_LOG.md`, `.cursor/rules/spec.mdc`, `AGENTS.md`, `scripts/docs-reorg.mjs`.
- Отклонения от ТЗ: источник правды для работы — `docs/tz/` + `CURRENT`, не монолит (монолит = archive).
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде основателя (кандидат: phone Mini App из OPEN_TASKS).

## [2026-10-07] — agents-md-canon — DONE

- Сделано: корневой `AGENTS.md` — канон (~60 строк): продукт, hot path, команды `pnpm`, hard rules, карта docs. Next.js-блок сдвинут вниз. `CLAUDE.md` = `@AGENTS.md`. `.cursor/rules/spec.mdc` — тонкий указатель. `docs/README.md` и `CURRENT.md` обновлены.
- Команды проверки: ручная сверка файлов; docs-only.
- P-тесты: нет.
- Миграции: нет.
- Изменённые файлы: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/spec.mdc`, `docs/README.md`, `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения: нет (выравнивание с agents.md / индустрией).
- OPEN QUESTION: нет.
- Следующая подфаза: по команде основателя.

## [2026-10-07] — email-system-design (ветка `feat/email-system-design`, без merge) — PARTIAL

- Сделано: единый email-макет (D330); брендированные Supabase-шаблоны confirmation/recovery/magic_link (ru/en) + подключение в `supabase/config.toml`; карточки вакансий в письме `matches.digest`; русские формы плюрализации в шаблонах уведомлений; страница настроек уведомлений — строки по событиям со свитчами по каналам + блок «письма об аккаунте приходят всегда»; auth-страницы: заголовок h2 вместо display, перенос длинных строк, страница «Проверьте почту» с подсказкой и ссылкой ко входу; dev-превью писем `/dev-emails/index.html` (в production 404).
- Команды проверки: `pnpm test` → 720 passed, 1 failed (`legal.test.ts`, legal sync — не наш файл, вероятно docs-reorg); `pnpm typecheck` → ok по нашим файлам (ошибки `register-form.tsx` были от параллельного агента и потом ушли); `pnpm lint` → 1 warning в неотслеживаемом `scripts/docs-reorg.mjs` (не наш).
- Ручная проверка: превью писем на 375 px и десктопе (без горизонтального скролла, длинные названия/компании переносятся), живые вакансии из dev-БД → «View job» открывает ту же вакансию; поток «Забыли пароль» → `/ru/auth/check-email`.
- Миграции: нет.
- Отклонения: в рабочем дереве одновременно работал другой агент (Spoki/бот/регистрация); по решению основателя продолжили в общем дереве — диффы перемешаны в `en/ru.json`, login/register pages.
- OPEN QUESTION: тема письма Supabase как Go-шаблон (см. D330). Шаблоны в облачный Supabase не загружены — нужен Dashboard.
- Следующая подфаза: по команде основателя (проверка → merge отдельно).

## [2026-10-07] — account-type D331 (ветка `feat/email-system-design`, без merge) — PARTIAL

- Сделано: выбор «Я ищу работу / Я работодатель» в регистрации; `users.account_type` (миграция 0031); запись из метаданных при подтверждении; работодатель после регистрации → `/employer/company`; `accountType` в `/api/me`; смена типа в настройках аккаунта.
- Команды проверки: `pnpm test` → 721 passed, 1 failed (`legal.test.ts`, не наш); `pnpm typecheck` → 0 ошибок; `pnpm lint` → 1 warning в чужом `scripts/docs-reorg.mjs`.
- Ручная проверка: форма на 375 px, без выбора типа — «Выберите, кто вы.»
- Миграции: `0031_account_type.sql` — НЕ применена к облачной БД. Пока не применена, локальный сервер (он смотрит в облачную БД) упадёт на чтении `users`.
- OPEN QUESTION: нет.
- Следующая подфаза: по команде основателя.
- Дополнение D331: в шапке аккаунт-работодатель видит «Вакансии · Мои вакансии · Компания · Spoki», без «Отклики / Сохранённые / Профиль» (`src/components/shell/header.tsx`, `nav.myJobs`, `nav.company`).

## [2026-10-07] — главная без счётчиков — DONE (локально, без коммита)

- Сделано: убран блок «Опубликованные вакансии / Компании» с главной (`HomeStats` в `src/app/[locale]/page.tsx`), ключи `home.statJobs`, `home.statCompanies`. Сервис `countPublicCatalog` оставлен (не удалял рабочий код модуля).
- Проверка: typecheck 0 ошибок; на `/ru` блока нет, остальные секции на месте.

## [2026-10-07] — Google и Telegram на входе (D335) — DONE (локально, без коммита)

- Сделано: кнопка Google ведёт в Supabase OAuth и возвращается в `/auth/callback`; согласие с условиями — cookie `google_terms`. Telegram на входе и регистрации всегда живая кнопка бота, не «Скоро». X остаётся заглушкой. Локальный сайт не переписывает webhook бота. Провайдер Google в облачном Supabase включён, секрет только в Dashboard. В allow list: `https://intgetion.com/**`, `http://localhost:3000/**`, `http://127.0.0.1:3000/**`.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts src/modules/auth/__tests__/telegram.test.ts` → 46 passed. Повтор: `GET /api/auth/google?locale=ru` → Supabase → `accounts.google.com`. В браузере с `http://localhost:3000` согласие Google вернуло на `/ru` уже вошедшим.
- Миграции: `0031_account_type.sql` применена к облачной БД (`pnpm db:migrate`). Без колонки `account_type` callback падал на чтении `users`.
- Отклонения: D7 отложен OAuth на V2; основатель включил Google сейчас (D335). С `127.0.0.1` callback не видит cookie, выставленную на `localhost`, и показывает `invalid_link`. Локально открывать `http://localhost:3000`.
- OPEN QUESTION: нет.
- Следующая подфаза: по команде основателя.

## [2026-10-07] — вход через X (D336) — PARTIAL

- Сделано: кнопка X на входе и регистрации ведёт в `/api/auth/x`, дальше тот же `/auth/callback` и cookie согласия, что у Google. Новый аккаунт — кандидат. Пока провайдер выключен, кнопка возвращает `oauth_unavailable`.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts` → 28 passed; `pnpm exec tsc --noEmit` → 0. `GET /api/auth/x?locale=ru` → 307 на вход с `oauth_unavailable` (провайдер в Supabase ещё выключен). На `/ru/login` есть ссылка `/api/auth/x?locale=ru`.
- Миграции: нет.
- Отклонения: D335 оставлял X «Скоро»; основатель подключил X сейчас (D336). Портал developer.x.com требует вход в X. Вход через Google в этом браузере открыл окно выбора аккаунта и не вернул сессию на страницу X, поэтому клиент OAuth ещё не создан.
- OPEN QUESTION: нет. Client id и secret — в Dashboard Supabase, не в чате и не в git.
- Следующая подфаза: дописать провайдер X, когда в браузере есть вход в портал разработчика X.

## [2026-10-07] — переключатель новых вакансий в боте (D329) — DONE (локально, без коммита)

- Сделано: с ветки `claude/notify-bot` перенесён переключатель на `/notifications`. Он пишет канал telegram сразу для `search.alert`, `matches.digest` и `company.new_jobs`. Без привязанного Telegram выключен и ведёт в настройки аккаунта.
- Команды проверки: typecheck и eslint по затронутым файлам. Живой клик по переключателю без привязанного Telegram не сохраняет настройку — переключатель disabled.
- Миграции: нет.
- Отклонения: нет. Это обновление Claude (D329), не новая схема.
- OPEN QUESTION: нет.
- Следующая подфаза: по команде основателя.
## [2026-10-07] — телефонный Mini App, четвёртая правка — D324

- Сделано: ресерч — в проде за 2 дня почти нет `POST …/telegram/miniapp` (группировка путей: `/api/auth/telegram` ×2), значит на телефоне `initData` не появляется. Desktop ок без скрипта; телефонный WebView отдаёт данные через `telegram-web-app.js`. Одна попытка: CSP + скрипт, bounce/`tg.html` ждут bridge, `sessionStorage` для raw init, клиент ~5 с + `ready()`.
- Команды проверки: `pnpm exec vitest run src/components/auth/mini-app-open.test.ts src/lib/security.test.ts` → 0 (2 файла, 31 тест). eslint → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D324. Список хвоста: `docs/OPEN_TASKS.md`.
- OPEN QUESTION: живая проверка кнопки меню бота на телефоне. Если снова нет входа — оставить в OPEN_TASKS, без новых правок auto-sign-in.

## [2026-10-07] — телефонный Mini App после D324 — NOT DONE

- Сделано: основатель подтвердил — с телефона по кнопке меню по-прежнему не входит. D324 на проде (READY), правки входа больше не делались. Задача зафиксирована как **НЕ ЗАКРЫТО** в `docs/OPEN_TASKS.md`. Обход: вход через бота `login_*`, не Mini App menu.
- Команды проверки: код не менялся; runtime-логи Vercel (~2 ч) — вызовов `telegram/miniapp` не видно.
- Миграции: нет. Решения: нет новых (D324 остаётся последней попыткой).
- OPEN QUESTION: нет. Нужны факты с телефона (iOS/Android, URL BotFather, что на экране), прежде чем брать отдельную задачу.

## [2026-10-07] — брендированные письма Auth (D325) — ветка cursor/auth-emails

- Сделано: HTML-оболочка писем (headline/preheader/кнопка), тексты `authEmails` en/ru, hook `POST /api/auth/hooks/send-email` (Resend + Standard Webhooks), шаблоны `supabase/templates`, CSRF-исключение, в кабинете после привязки почты — «Задать пароль». Привязка почты к Telegram (D231) уже была — письмо переведено на общий бренд. **В master/прод не вливать** по просьбе основателя; включение Hook — RUNBOOK §15 / OPEN_TASKS.
- Команды проверки: `pnpm exec vitest run src/lib/email-html.test.ts src/lib/security.test.ts src/modules/auth/__tests__/auth-emails.test.ts` → 0 (3 файла, 31 тест). eslint → 0. `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D325. Ветка `cursor/auth-emails` — **не вливать в прод** без явной команды.
- OPEN QUESTION: когда выкладывать — включить Send Email Hook в Supabase и `AUTH_SEND_EMAIL_HOOK_SECRET` в Vercel (RUNBOOK §15).

## [2026-10-07] — confirm UX: localhost + confirmed page (D326) — ветка cursor/auth-confirm-ux

- Сделано: `publicAuthRedirect` в hook (localhost/чужой origin → `NEXT_PUBLIC_SITE_URL`); HTML письма без сырого URL под кнопкой; `/auth/confirmed` после успешного callback; `CheckEmailWatch` (poll `/api/me` + BroadcastChannel) обновляет вкладку на компьютере. Site URL в Dashboard при выкладке — `https://intgetion.com`.
- Команды проверки: `pnpm exec vitest run src/lib/email-html.test.ts src/modules/auth/__tests__/auth-emails.test.ts` → 0 (2 файла, 11 тестов); eslint по изменённым файлам → 0; `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D326. Влита в master (PR #7).
- OPEN QUESTION: нет.

## [2026-10-07] — повторная регистрация показывает статус (D327) — ветка cursor/register-exists

- Сделано: парольная регистрация на уже занятый email — если не подтверждён, `auth.resend` + check-email `?resent=1`; если подтверждён — `409 EMAIL_ALREADY_REGISTERED` с текстом войти/сброс. Admin lookup `findAuthUserByEmail`.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts` → 0 (25 tests); `pnpm exec tsc --noEmit` → 0.
- Миграции: нет. Решения: D327. Влита (PR #8).
- OPEN QUESTION: нет.

## [2026-10-07] — email wait: телефон подтверждает, ПК входит (D328)

- Сделано: таблица `auth_email_waits`; magic-link/register кладут `wait` в письмо; телефон → `/auth/signed-in`; ПК poll `POST /api/auth/email-wait` забирает handoff-сессию. Текст «Эта почта уже зарегистрирована» без generic при сбое resend.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts src/modules/auth/__tests__/email-wait.test.ts` → 0 (29 tests); `pnpm exec tsc --noEmit` → 0.
- Миграции: `0030_auth_email_waits.sql`. Решения: D328. Влита (PR #9).
- OPEN QUESTION: нет.

## [2026-10-07] — D328 отложено основателем — NOT DONE

- Сделано: код D328 в проде, но живой сценарий «ссылка на телефоне → вход на ПК» **не работает хорошо**. По просьбе основателя — **не чинить сейчас**, записать в `docs/OPEN_TASKS.md` как **НЕ ЗАКРЫТО / ОТЛОЖЕНО**. Обход: открыть ссылку на том же устройстве/браузере или войти паролем / Telegram-ботом.
- Команды проверки: код не менялся (только docs).
- Миграции: нет. Решения: нет новых.
- OPEN QUESTION: нет. Следующий заход — только по явной команде + факты с телефона/Network/`/api/auth/email-wait`.

## [2026-10-07] — значки Telegram / Google / X на входе

- Сделано: SVG-марки брендов напротив подписей «Continue with …» на `/login` и `/register` (`social-icons.tsx`). Google и X по-прежнему «Скоро»; Telegram — как был.
- Команды проверки: eslint + `tsc --noEmit` → 0.
- Миграции: нет. Решения: нет.
- OPEN QUESTION: нет.
