# MISSION_LOG

## [2026-10-14] — окно WalletConnect на телефоне (D425) — DONE локально

- Сделано: на ширине до 767px кнопка оплаты открывает окно WalletConnect на весь экран, даже если в браузере стоит MetaMask. Внутри приложения кошелька остаётся его провайдер. На широком экране по-прежнему сначала расширение. На сайт не выкладывалось.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1046 прошло, 1 пропущен). `pnpm build` → 0. В браузере на ширине 390 px при подставленном `window.ethereum` окно WalletConnect открылось на весь экран (`data-mobile-fullscreen`, слой 200). На сайт не выкладывалось.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/billing/ui/connect-wallet.ts`, `src/modules/billing/ui/connect-wallet.test.ts`, `src/modules/billing/ui/crypto-pay.tsx`, `src/app/globals.css`, `.cursor/skills/walletconnect/SKILL.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя

## [2026-10-14] — кнопка услуг открывает ассистента (D423) — DONE локально

- Сделано: на `/services` кнопка «Обговорить все детали с ассистентом» ведёт на `/chat?from=services`. Сервер принимает только это значение и ставит его в состояние общей беседы. Если сообщений ещё не было, первая реплика — от компании. Дальше ассистент представляет INTGETION и отвечает, как выполняется работа. Сумму не выдумывает. Промпт версии 16. На сайт не выкладывалось.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1044 прошло, 1 пропущен). `pnpm eval` → 0. `pnpm build` → 0. В браузере http://localhost:3000/ru/services кнопка ведёт на `/ru/chat?from=services`, в чате строка «Вы перешли из раздела «Услуги»» и возврат к услугам. Вкладок поиска работы нет. Ответ модели локально не проверен: агент ответил, что сейчас недоступен.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/app/[locale]/services/page.tsx`, `src/app/[locale]/chat/page.tsx`, `src/components/bot/chat.tsx`, `src/app/api/bot/conversation/route.ts`, `src/app/api/bot/message/route.ts`, `src/modules/bot/prompts/system.ts`, `src/modules/bot/service/service-focus.ts`, `src/modules/bot/service/conversation.ts`, `src/modules/bot/service/tools.ts`, `src/modules/bot/service/index.ts`, `src/modules/bot/schemas/index.ts`, `src/modules/bot/__tests__/service-focus.test.ts`, `src/modules/bot/__tests__/memory.test.ts`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `docs/tz/12-bot.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя

## [2026-10-14] — выкладка рабочей папки на сайт — DONE на сайте, коммита нет

- Сделано: `npx vercel deploy --prod --yes` из рабочей папки. Алиас https://intgetion.com, `dpl_73u2WYWFCgtdGQosu9JwNsQE44HC`, READY. На сайте страница услуг (десять групп, 106 пунктов, форма), карьерные страницы компаний и cron импорта каждые 10 минут (D416), стиль кассы без nonce в `style-src` (D420). В git по-прежнему `057a340`: следующий push в `master` соберёт коммит и снимет эти файлы.
- Команды проверки: перед выкладкой `pnpm typecheck` → 0, `pnpm lint` → 0, `pnpm test` → 0 (1034 прошло, 1 пропущен), `pnpm build` → 0. После: `https://intgetion.com/api/health` → 200. `/ru` содержит `dpl_73u2WYWFCgtdGQosu9JwNsQE44HC`. `/ru/services` → 200, в браузере десять групп и пункты «Дизайн» и «Коммуникации». `/company` и `/services` → 200. На `/ru/services` `style-src` с nonce. На `/ru/billing/crypto` ответ 307 и `style-src 'self' 'unsafe-inline'` без nonce.
- P-тесты подфазы: нет
- Миграции: `0048` не применялась. Согласованного пути на облако нет, `pnpm db:migrate` туда не ходит.
- Изменённые файлы: выкладка всей рабочей папки. Документы: `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: как применить `0048` на облако, не ломая журнал `public.schema_migrations`
- Следующая подфаза: по команде основателя

## [2026-10-14] — ещё услуги на странице (D417) — DONE локально

- Сделано: в рабочем пространстве десять групп и 106 коротких пунктов на семи языках. Добавлены дизайн и коммуникации, плюс новые пункты в прежних группах. Форма на месте. На сайт не выкладывалось.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1034 прошло, 1 пропущен). `pnpm build` → 0. В браузере http://127.0.0.1:3000/ru/services десять групп и 106 пунктов. На ширине 390 px страница не разъезжается.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя

## [2026-10-14] — шире пул на странице услуг (D417) — DONE локально

- Сделано: в рабочем пространстве восемь групп и 68 коротких пунктов из каталога компании: операции, сообщество, рост, продукт, разработка, Web3, люди, исследования. Форма на месте. На сайт не выкладывалось.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1034 прошло, 1 пропущен). `pnpm build` → 0. В браузере http://127.0.0.1:3000/ru/services восемь групп и 68 пунктов. На ширине 390 px страница не разъезжается.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/app/[locale]/services/page.tsx`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя

## [2026-10-14] — рабочее пространство на странице услуг (D417) — DONE локально

- Сделано: `/services` — узкая колонка по центру. Середина — поле «Рабочее пространство»: шесть групп и короткий спектр (операции, сообщество, рост, продукт, Web3, советы), форма заявки в том же поле. На сайт не выкладывалось.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1034 прошло, 1 пропущен). `pnpm build` → 0. В браузере http://127.0.0.1:3000/ru/services: поле по центру, шесть групп, форма внутри. На ширине 390 px страница не разъезжается.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/app/[locale]/services/page.tsx`, `src/components/company/brief-form.tsx`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя

## [2026-10-14] — скилл дизайна в паре с фронтенд-скиллом (D418) — DONE

- Сделано: проектный скилл `.claude/skills/intgetion-design/SKILL.md`. Его читают в том же ходе, что Vercel `react-best-practices`. Вид — из `docs/DESIGN.md`, стоимость рендера — у фронтенд-скилла. Строка таблицы в `AGENTS.md`. Копию фронтенд-скилла в репозиторий не клали. Код страниц не менялся.
- Команды проверки: `pnpm exec prettier --write` по скиллу и документам → 0
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `.claude/skills/intgetion-design/SKILL.md`, `AGENTS.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя

## [2026-10-14] — отдельная страница услуг (D417) — DONE локально

- Сделано: пункт «Услуги» открывает `/services`. На странице короткий список направлений и строка, что задачу вне списка тоже можно описать. Форма переехала с `/company` и получила срок сотрудничества и когда начать. Карточка Spoki ведёт туда же. Промпт не менялся. На сайт не выкладывалось. Заявка по-прежнему не сохраняется, пока `0048` не на облаке. Колонки срока добавлены в эту ещё не применённую миграцию.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1034 прошло, 1 пропущен). `pnpm build` → 0, маршрут `/[locale]/services`. В браузере http://127.0.0.1:3000/ru/services: список, поля срока и старта, короткая задача получает «Опишите задачу в нескольких предложениях». Пункт меню «Услуги» открывает эту страницу. На `/ru/company` формы нет, в HTML есть ссылка `/ru/services`.
- P-тесты подфазы: нет
- Миграции: `0048_engagement_briefs.sql` дополнена `duration` и `start_when`. На облако не применялась
- Изменённые файлы: `src/app/[locale]/services/page.tsx`, `src/app/[locale]/company/page.tsx`, `src/components/company/brief-form.tsx`, `src/components/shell/header.tsx`, `src/components/shell/nav-icons.tsx`, `src/components/shell/nav-icons.test.ts`, `src/app/api/company/briefs/route.ts`, `src/app/(admin)/[locale]/admin/engagements/page.tsx`, `src/app/sitemap.ts`, `src/modules/companies/engagement-brief.ts`, `src/modules/companies/service/engagement-brief.ts`, `src/modules/companies/__tests__/engagement-brief.test.ts`, `src/modules/bot/service/offers.ts`, `src/modules/bot/__tests__/tools.test.ts`, `src/db/schema/engagement.ts`, `src/db/migrations/0048_engagement_briefs.sql`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `docs/DECISIONS.md`, `docs/tz/12-bot.md`, `docs/PLANS.md`, `docs/OPEN_TASKS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: номер D416 уже занят карьерными страницами, эта страница — D417
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Коммит и выкладка снимут старую форму на сайте только после «да»

## [2026-10-14] — агрегатор: карьерные страницы компаний и место вакансии (D416) — DONE в коде

- founder approved: republish allowed — Greenhouse, Lever, Ashby (карьерные страницы компаний), Adzuna, Reed, USAJobs, hh.ru. Подключены первые три; остальные ждут регистрации основателя.
- Сделано: 39 карьерных страниц (список проверен живыми запросами), место вакансии (формат, текст, страны) в конвейере и в `jobs`, снятие пропавших со страницы вакансий, cron импорта каждые 10 минут, скилл `intgetion-import` и строка в `AGENTS.md`. На реальных ответах Stripe, Palantir и OpenAI страна определена у всех 1843 вакансий.
- Команды проверки: см. отчёт сессии.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/ingestion/adapters/{company-boards,live,types,himalayas,jobicy,remoteok,remotive}.ts`, `service/{ingest-fixtures,normalize,outcome}.ts`, `src/modules/jobs/service/imported-jobs.ts`, тесты, `vercel.json`, `.claude/skills/intgetion-import/SKILL.md`, `AGENTS.md`, `docs/tz/13-import.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: источники с ключами после регистрации основателя

## [2026-10-14] — импорт D412 на сайте, чистка каталога — DONE

- Сделано: коммит `41a88d4` (только 24 файла D412, без D413) запушен в `master`, GitHub-интеграция выложила `dpl_3CrVTzNqTqSQJbkFTtLBCAFxPD1W` на intgetion.com. Проверено: `/api/health`, `/`, `/jobs`, `/en/jobs/rss.xml` → 200, `/api/cron/import` без секрета → 404, CSP `/billing/crypto` с реле WalletConnect. В RSS 23 вакансии: 22 Jobicy и 1 своя. В облачной базе снята 131 вакансия (18 выдуманных, 113 из снимков 2026-10-04) и возвращена 171, снятая старым правилом. Ничего не удалялось. Прогон 19:30 UTC на новом коде закрыл 20 зависших прогонов; источники ещё в своём 6-часовом интервале.
- Команды проверки: на дереве коммита `pnpm typecheck` → 0, `pnpm lint` → 0, `pnpm test` → 0 (1011 прошло, 1 пропущен), `pnpm build` → 0. CI на `master` красный и до D412: `format:check` на 9 чужих файлах, e2e админки.
- P-тесты подфазы: нет
- Миграции: нет. Облачная база: две транзакции UPDATE статусов с записью в `job_status_history`
- Изменённые файлы: `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: Remote OK вне канала и RSS; `/jobs/rss.xml` → 404 (было и раньше)
- Следующая подфаза: наблюдение `import_runs` до 2026-10-16

## [2026-10-14] — выкладка услуг на сайт — DONE на сайте, коммита нет

- Сделано: рабочая папка выложена командой `npx vercel deploy --prod`. Выкладка `dpl_6i3hDaSccDS7uYnNdysZg46noagx` READY, алиас https://intgetion.com. На `/ru` есть «Услуги». На `/ru/company#contact` есть форма и поле бюджета. `GET /api/health` → 200. Коммита нет: в `master` по-прежнему `057a340`. Следующий push в `master` соберёт сайт из git и снимет эти файлы.
- Команды проверки: `pnpm build` → 0 перед выкладкой. `GET https://intgetion.com/ru` → 200, `data-dpl-id` совпал. `GET https://intgetion.com/api/health` → 200. `GET https://intgetion.com/ru/company` → 200, форма на месте. В браузере та же страница: «Услуги», «Describe the task», «Approximate budget».
- P-тесты подфазы: нет
- Миграции: `0048` на облако не применялась. Отправка заявки на сайте не сохраняется
- Изменённые файлы: `docs/CURRENT.md`, эта запись. Код выложен из рабочей папки, в git не входил
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: коммит этих файлов, иначе следующая сборка из `master` их сотрёт

## [2026-10-14] — услуга почти любая, только если спросили (D415) — DONE локально

- Сделано: Spoki больше не держит меню из трёх пакетов. Почти любую названную работу специалистов можно обсудить. На вопрос отвечает без карточки. Карточку заказа ставит только когда просят заказать. Сам тему не открывает: ни на приветствии, ни в поиске вакансий, ни при публикации. Цену числом не выдумывает. Промпт версии 15. На сайт не выкладывалось.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1015 прошло, 1 пропущен). `pnpm eval` → 0 (файл `eval-ci.test.ts`). Живой диалог с моделью не гонял.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/bot/prompts/system.ts`, `src/modules/bot/service/tools.ts`, `src/modules/bot/__tests__/memory.test.ts`, `docs/tz/12-bot.md`, `docs/DECISIONS.md`, `docs/PLANS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя

## [2026-10-14] — услуги в меню и разговор ассистента (D414) — DONE локально

- Сделано: в верхнем меню пункт «Услуги» открывает форму на `/company#contact`. В форме есть поле примерного бюджета. Spoki, промпт версии 14, для задачи вроде SMM называет пакет и четыре шага, говорит что цена зависит от объёма, сумму не выдумывает и ставит карточку на ту же форму. Почту в чате не спрашивает. Это не вакансия и не тарифы доски. На сайт не выкладывалось. Заявка по-прежнему не сохраняется, пока `0048` не на облаке.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1015 прошло, 1 пропущен). `pnpm eval` → 0. `pnpm build` → 0. В браузере на http://localhost:3000/ru пункт «Услуги» открывает http://localhost:3000/ru/company#contact, на форме есть поле бюджета. Живой диалог с моделью не гонял: он пишет в общую базу.
- P-тесты подфазы: нет
- Миграции: `0048` дополнена колонкой `budget`, на облако не применялась
- Изменённые файлы: меню, иконка, промпт, `offer_step` `order_service`, форма, схема и миграция, сообщения семи языков, `docs/tz/12-bot.md`, `docs/DECISIONS.md`, `docs/PLANS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: цена услуги не названа числом, потому что на странице компании её нет (D414)
- OPEN QUESTION: как применить `0048` на облако
- Следующая подфаза: по команде основателя

## [2026-10-14] — заявка на задачу с /company (D413) — BLOCKED на миграцию

- Сделано: на `/company` форма «опишите задачу» (почта или Telegram, компания по желанию). Это не вакансия. Текст страницы по-прежнему один английский. Ссылки Telegram, Discord и LinkedIn остались. Список для тех, кто читает персональные данные: `/admin/engagements`. В планы добавлены P-OPEN-LINE (одна строка, сколько вакансий открыто; без «люди ищут прямо сейчас») и P-ENGAGE-BOT (ассистент принимает ту же задачу позже, код не писался).
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1015 прошло, 1 пропущен). `pnpm build` → 0. В браузере `http://127.0.0.1:3000/ru/company#contact`: форма, пример про SEO, кнопка «Send the task». Короткий текст «Need SEO» не уходит на сервер и показывает «Describe the problem in a few sentences.» Живую заявку не отправлял: запись пошла бы в общую облачную базу, а таблицы там ещё нет.
- P-тесты подфазы: нет
- Миграции: `src/db/migrations/0048_engagement_briefs.sql` в репозитории, на облако не применялась
- Изменённые файлы: форма, `POST /api/company/briefs`, схема и миграция, админка, `en.json` (текст компании) и ключи админки в семи каталогах, `docs/PLANS.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: приём заявки, который D400 оставил открытым, сделан по команде основателя (D413). Лимит не добавлялся в `src/lib/rate-limit.ts` (файл чужой по PARALLEL_WORK): пять отправок в час считаются тем же счётчиком, отдельным ключом
- OPEN QUESTION: как применить `0048` на облако после защиты `scripts/db-url.mjs`
- Следующая подфаза: по команде основателя. Ассистент — P-ENGAGE-BOT

## [2026-10-14] — импорт: стабилизация четырёх API (D412) — DONE в коде, NOT DONE на production

- Сделано: этап 1 — разбор по облачной базе только чтением. Снимать 131 вакансию: 18 выдуманных из фикстур (19 строк источника, одна вакансия в двух лентах) и 113 из снимков 2026-10-04. У них 0 откликов, 0 сохранений, 0 покупок; 1 отзыв, 2 беседы бота, 23 события аналитики, 2 записи модерации — остаются при смене статуса. Этап 2 — код: один живой источник за вызов, бюджет 200 с, `maxDuration` 300, закрытие зависших прогонов, пакетные запросы `findLinkedJobIds` и `touchSourceRows`, окно 30 дней вместо «нет в ленте», дата окончания от источника, импорт не трогает `removed`/`closed`/`paused`, фикстуры только при локальной базе, в канал и RSS из импорта только Jobicy.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (1011 прошло, 1 пропущен). `pnpm build` → 0 (с `SWC_NATIVE_BINDING_CACHE`). Интеграционные тесты (`ingestion.integration.test.ts`) не запускались: нужна локальная база Supabase, её нет; идут в CI.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/ingestion/service/ingest-fixtures.ts`, `src/modules/ingestion/service/fixture-guard.ts` (новый), `src/modules/ingestion/service/outcome.ts`, `src/modules/ingestion/repo/import-repo.ts`, `src/modules/ingestion/adapters/live.ts`, `remotive.ts`, `himalayas.ts`, `jobicy.ts`, `remoteok.ts`, `src/modules/jobs/service/imported-jobs.ts`, `src/modules/jobs/service/jobs-alert.ts`, `src/modules/jobs/service/job-feed.ts`, `src/app/[locale]/jobs/rss.xml/route.ts`, `src/app/api/cron/import/route.ts`, `src/config/import-sources.ts` (новый), тесты `live-run.test.ts`, `imported-status.test.ts`, `import-sources.test.ts`, `jobs-alert.test.ts`, `docs/tz/13-import.md`, `docs/DECISIONS.md`, `docs/OPEN_TASKS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: 13.4 «два прогона подряд» оставлено только фикстурам (D412)
- OPEN QUESTION: оставлять ли Remote OK вне канала и RSS — его условия о сторонних сайтах молчат; выбрано консервативно «нет»
- Следующая подфаза: production по шагам из `docs/OPEN_TASKS.md` — каждый после «да» основателя

## [2026-10-14] — вакансия из бота на тарифе «Команда» (D411) — DONE

- Сделано: на тарифе «Команда» бот принимает роль и критерии, показывает карточку и ставит вакансию в очередь админа. Без тарифа или без компании открывает форму. Кандидатов не ищет. Промпт версии 13. На сайт не выкладывалось.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (994 прошло, 1 пропущен). `pnpm eval` → 0. `pnpm build` → 0. Карточку в браузере не нажимал: подтверждение пишет вакансию в ту же базу, что и сайт, а тарифа «Команда» в этой сессии нет.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/jobs/service/team-job.ts`, `src/modules/jobs/service/index.ts`, `src/modules/auth/service/auth-service.ts`, `src/modules/auth/service/index.ts`, `src/modules/bot/service/tools.ts`, `src/modules/bot/service/application-status.ts`, `src/modules/bot/prompts/system.ts`, `src/components/bot/chat.tsx`, сообщения семи языков, тесты, `docs/tz/12-bot.md`, `docs/how-it-works/bot.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: срез сценария работодателя V2 вытащен по команде основателя (D411). Поиск кандидатов не делался
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка — только после «да»

## [2026-10-14] — скиллы Telegram-бота и Telegram (D410) — DONE

- Сделано: два проектных скилла `.claude/skills/intgetion-telegram-bot/SKILL.md` и `.claude/skills/intgetion-telegram/SKILL.md`. В `AGENTS.md` две строки таблицы. Код бота, вебхук и флаг Mini App не менялись. На сайт не выкладывалось.
- Команды проверки: `pnpm exec prettier --check` по семи markdown-файлам → 0
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: оба `SKILL.md`, `AGENTS.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/how-it-works/bot.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя

## [2026-10-14] — вид чата Claude на localhost (D409) — DONE

- Сделано: вид из `claude/chat-look` (`b57e145`) соединён с текущим чатом на localhost. Приветствие по центру, капсула ввода, пузырь человека, обычный текст Spoki. Вкладки и вопросы D408 остались под приветствием. Номер D403 из той ветки не переиспользован: в master это касса. В `docs/PLANS.md` записан P-JOB-COUNTS: на вакансии счётчик откликов и просмотров, код не писался. На продукт не выкладывалось.
- Команды проверки: `pnpm lint` → 0. `pnpm test` → 0 (990 прошло, 1 пропущен). `pnpm exec tsc --noEmit` → 0. `pnpm build` → 0. В браузере `http://127.0.0.1:3000/ru/chat`: до загрузки истории видно «С чего начнём?» и подпись про Telegram; у этой гостевой сессии история уже была, поэтому вкладки после загрузки спрятались и осталась беседа. Поле ввода на месте.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/components/bot/chat.tsx`, `src/app/globals.css`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/PLANS.md`, `docs/tz/12-bot.md`, `docs/how-it-works/bot.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: видит ли счётчик откликов и просмотров гость или только владелец вакансии (P-JOB-COUNTS)
- Следующая подфаза: по команде основателя. Выкладка на сайт — только после его «да»

## [2026-10-14] — живое состояние, спрос и стартовые вопросы (D408) — DONE

- Сделано: два инструмента только на чтение (`get_my_standing`, `published_demand`). Промпт версии 12 называет причины из `get_matches` и статус отклика и не выдумывает счёт. После подтверждения отклика чат показывает статус. Пустой чат: три вкладки, четыре вопроса из 20, свой ввод остаётся. Вкладка найма ведёт в уже существующую форму вакансии. Почта в standing не попадает. Эмбеддинги не включались.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 0 (990 прошло, 1 пропущен). `pnpm eval` → 0. `pnpm build` → 0. В браузере на `http://localhost:3000/ru/chat` у гостя три вкладки, смена вкладки меняет вопросы, нажатие отправляет вопрос и прячет вкладки, поле ввода на месте. Ответ модели в этом прогоне — «агент недоступен»: `botLLM()` вернул пусто, это не ошибка новых инструментов. У вошедшего с историей вкладок нет.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/bot/service/tools.ts`, `standing.ts`, `starters.ts`, `application-status.ts`, `prompts/system.ts`, `src/modules/jobs/service/demand.ts`, `src/modules/jobs/service/index.ts`, `src/modules/jobs/repo/public-search-repo.ts`, `src/components/bot/chat.tsx`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, тесты standing, starters, application-status, demand, tools, memory, `docs/tz/12-bot.md`, `docs/how-it-works/bot.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет. Сценарии работодателя из V2 не открывались
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. На сайт не выложено

## [2026-10-14] — проектные скиллы Vercel и Supabase (D407) — DONE

- Сделано: два проектных скилла `.claude/skills/intgetion-vercel/SKILL.md` и `.claude/skills/intgetion-supabase/SKILL.md`. Факты взяты из `vercel.json`, `.vercel/project.json`, `scripts/db-url.mjs`, `scripts/apply-migrations.mjs`, `0046_sanctions.sql`, RUNBOOK, D314, D325–D339, D398, D403, D405 и этого журнала. В `AGENTS.md` таблица скиллов указывает на них, и сказано, где лежат проектные скиллы.
- Команды проверки: `pnpm exec prettier --check` по шести изменённым файлам → 0 (таблицы в `AGENTS.md` и `docs/CURRENT.md` выровнены `prettier --write`, текст не менялся)
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `.claude/skills/intgetion-vercel/SKILL.md`, `.claude/skills/intgetion-supabase/SKILL.md`, `AGENTS.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: как применять миграции к облаку, раз `pnpm db:migrate` облачные хосты отклоняет (D407). Читает ли Cursor `.claude/skills/` в этой версии — проверить в Cursor.
- Следующая подфаза: по команде основателя.

## [2026-10-14] — QR WalletConnect и скилл кассы (D406) — DONE

- Сделано: скилла WalletConnect не было. Добавлен проектный `.cursor/skills/walletconnect/SKILL.md` (основатель прямо попросил этот один). `@reown/appkit@1.8.19` стал прямой зависимостью: модалка импортирует `@reown/appkit/core`, а вложенный пакет сборщик не находил. На `/billing/crypto` политика дополнительно пускает RPC, каталог кошельков, шрифт и картинки модалки; `style-src` на этой странице включает `unsafe-inline`, потому что стили AppKit без nonce. `script-src` остаётся с nonce. Телеметрия pulse не добавлена. На остальных страницах этих узлов нет. Tron и Solana не выдуманы. Коммита и выкладки нет.
- Команды проверки: `pnpm add @reown/appkit@1.8.19`. `pnpm exec vitest run src/lib/security.test.ts src/modules/billing/ui/connect-wallet.test.ts` → 2 файла, 26 тестов, 0 падений.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `package.json`, `pnpm-lock.yaml`, `src/lib/security-headers.ts`, `src/lib/security.test.ts`, `src/proxy.ts`, `src/modules/billing/ui/connect-wallet.ts`, `.cursor/skills/walletconnect/SKILL.md`, `AGENTS.md`, `docs/DECISIONS.md`, `docs/tz/23-billing.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Чтобы QR был на сайте, эти файлы нужно закоммитить и выложить.

## [2026-10-14] — локальная касса как на сайте — DONE

- Сделано: в `.env.local` дописаны настройки приёма с production: включение, провайдер WalletConnect, адрес получателя EVM, контракты токенов и RPC Ethereum, Polygon, Arbitrum, Base. `NEXT_PUBLIC_SITE_URL` оставлен `http://localhost:3000`. Адреса Tron и Solana CLI не отдал (секрет production), их локально нет. Значения в журнал не писались. Файл в git не входит. Сервер перезапущен. На `/pricing` и `/ru/pricing` кнопка «Оплатить в USDT или USDC», не «Скоро».
- Команды проверки: форма флагов без печати значений — enabled, provider, wallet, contracts, четыре RPC, site localhost. `curl` тарифов — кнопка оплаты есть, «Скоро» нет.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `.env.local` (не в git), эта запись
- Отклонения от ТЗ: нет. Оплата с localhost — настоящий перевод на тот же кошелёк, что на сайте.
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя.

## [2026-10-14] — локальный просмотр собранных правок — DONE

- Сделано: отдельного слияния не было. Правки Клода уже в `master` (футер Company, ход Spoki, удержание сессии), сегодняшние незакоммиченные правки уже в этой папке. Поднят `pnpm dev` на http://localhost:3000. Главная, `/company`, `/ru/company`, `/portfolio`, `/pricing`, `/jobs` отвечают 200. `/company` и `/ru/company` показывают английский текст. В футере есть About Us, Feedback, Email Support, Ambassador Program, API Access, Verify Official Accounts, Portfolio. `/billing/crypto` без входа уходит на `/login?next=billing`. Коммита и выкладки нет.
- Команды проверки: `pnpm dev` → Ready. `curl` страниц → 200, касса → 307 на вход.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `docs/CURRENT.md`, эта запись. Код не менялся.
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя.

## [2026-10-14] — WalletConnect на production (D403) — DONE

- Сделано: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` записан только в Vercel production проекта `intgetion-job-list`. Значение в git и в журнал не писалось. Другие переменные не менялись. Выкладка `dpl_4DFmiBPxQGdCDnxun3yTqUxMC9WJ` стоит на https://intgetion.com. Это снимок `2ddb23d` плюс политика кассы: реле и проверка WalletConnect только на `/billing/crypto`. Первая сборка упала, потому что `security-headers.ts` тянул `@/i18n/routing`, а `next.config.ts` грузит этот файл до алиаса. Проверка пути вынесена в `src/lib/crypto-pay-path.ts`. Живой заголовок кассы содержит `wss://relay.walletconnect.org` и узлы проверки; главная их не содержит. Коммита нет: следующая выкладка из `master` сотрёт эти три файла.
- Команды проверки: `pnpm exec vitest run src/lib/security.test.ts` → 0, 24 теста. `npx vercel deploy --prod` → READY, алиас https://intgetion.com. `curl -sI https://intgetion.com/billing/crypto` и `https://intgetion.com/` — политика как выше.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/lib/security-headers.ts`, `src/lib/crypto-pay-path.ts`, `src/proxy.ts`, `src/lib/security.test.ts`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Чтобы политика пережила следующую выкладку из git, эти файлы нужно закоммитить.

## [2026-10-14] — агент доводит задачу до цели — DONE

- Сделано: в `AGENTS.md` записано, что задача кончается рабочим исходом, а не первым куском кода. Регистрация, project id, секрет в нужном хранилище и выкладка, без которой фича не работает на сайте, входят в ту же задачу. Пример отказа — WalletConnect: спросить про регистрацию, потом отдельно про Vercel. Навыки плагинов в репозиторий не копировались: Vercel (`env-vars`, `deployments-cicd`, `vercel-cli`) и Supabase читать из уже установленных. Чужие стеки не подключать. Кода продукта нет, выкладки нет.
- Команды проверки: нет, менялись только инструкции
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `AGENTS.md`, `.cursor/rules/spec.mdc`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Для WalletConnect это значит дописать переменную на production и выложить, не спрашивая ещё раз.

## [2026-10-14] — английский текст компании, футер без задачи (D404) — DONE (локально, не выложено)

- Сделано: текст `/company` остаётся одним английским блоком в `en.json`. Из ru, es, pt-BR, de, fr и it этот блок убран. На языковом адресе страница показывает тот же английский текст, оболочка — на языке адреса. Шесть пунктов футера без адреса записаны как открытый вопрос без задачи в коде: страниц и ссылок нет. Портфолио не менялось. На сайт не выложено, коммита нет.
- Команды проверки: `pnpm exec vitest run src/messages/messages.test.ts` → 0, 16 тестов. `pnpm exec tsc --noEmit` → 0. `pnpm exec eslint --max-warnings 0` по затронутым ts/tsx → 0.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/app/[locale]/company/page.tsx`, `src/i18n/messages.ts`, `src/messages/{ru,es,pt-BR,de,fr,it}.json`, `src/messages/messages.test.ts`, `src/components/shell/footer-groups.ts`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: нет. D400 оставлял английский текст в чужих каталогах «до перевода»; D404 этот перевод отменяет.
- OPEN QUESTION: адреса шести пунктов футера. Приём заявки на `/company` не решён.
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-14] — WalletConnect Project ID локально (D403) — DONE (локально, не выложено)

- Сделано: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` есть в `.env.local`. Значение в git и в журнал не писалось. Файл в `.gitignore` и не отслеживается. Пустой id берёт кошелёк браузера. Непустой открывает QR WalletConnect; тест подменяет модуль, сеть не открывалась. Реле и проверка только на `/billing/crypto`. Второй проект в кабинете не создавался. Домены `https://intgetion.com` и `http://localhost:3000` уже в списке проекта. Переменные Vercel не менялись. Выкладки, коммита и миграции нет. На production ту же переменную ещё нужно записать и выложить.
- Команды проверки: `pnpm exec vitest run src/modules/billing/ui/connect-wallet.test.ts src/modules/billing/ui/crypto-pay.test.ts src/lib/security.test.ts` → 0, 3 файла, 27 тестов. TypeScript в этом проходе не менялся.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `docs/DECISIONS.md` (уточнение D403, нового номера нет), `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `docs/tz/23-billing.md`, `docs/tz/25-held-tails.md`, эта запись. Код кассы и политики уже был в предыдущей записи этого дня.
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: записать `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` в Vercel production и выложить. Другие переменные не менять. Эта сессия выкладку не делала.

## [2026-10-14] — WalletConnect Project ID (D403) — код без id, затем id появился

- Сделано: в начале этой записи Project ID ещё не было в `.env.local`. Значение не печаталось и не выдумывалось. Пустой id по-прежнему берёт кошелёк браузера. Непустой id выбирает WalletConnect с QR (`showQrModal`); модуль в тесте подменён, сеть не открывалась. Политика страницы пускает `wss://relay.walletconnect.org` и узлы `verify.walletconnect.org` / `verify.walletconnect.com` только на `/billing/crypto`. Выкладки, коммита и миграции нет. Актуальный статус — запись выше: id уже в локальном файле.
- Команды проверки: `pnpm exec vitest run src/modules/billing/ui/connect-wallet.test.ts src/modules/billing/ui/crypto-pay.test.ts src/lib/security.test.ts` → 0, 3 файла, 27 тестов. `pnpm exec tsc --noEmit` → 0. `pnpm exec eslint --max-warnings 0` по затронутым ts/tsx → 0.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/billing/ui/connect-wallet.ts`, `src/modules/billing/ui/connect-wallet.test.ts`, `src/modules/billing/ui/crypto-pay.tsx`, `src/lib/security-headers.ts`, `src/lib/security.test.ts`, `src/proxy.ts`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись
- Отклонения от ТЗ: нет. D356 остаётся: без Project ID платят кошельком в браузере.
- OPEN QUESTION: нет
- Следующая подфаза: локальный файл уже заполнен, см. запись выше. На production переменную ещё нужно записать и выложить. Второй проект в кабинете не создавать.

## [2026-10-12] — сплит, если Google или X уже отдельный аккаунт (D402) — DONE (локально, не выложено)

- Сделано: автоматический вход из D401 снят. На «Настройки → Аккаунт» остаются две кнопки: войти этим аккаунтом или остаться в текущем. Слияния нет. На сайт не выложено, коммита нет.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts src/messages/messages.test.ts`
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/app/[locale]/auth/callback/route.ts`, `src/app/[locale]/settings/account/page.tsx`, `src/components/settings/account-sign-in.tsx`, `src/components/settings/sign-in-methods.tsx`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `src/modules/auth/__tests__/auth-service.test.ts`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-12] — вход уже существующим Google или X (D401) — DONE (локально, не выложено)

- Сделано: если привязка Google или X упирается в то, что этот вход уже отдельный аккаунт, браузер сразу открывает обычный вход этим провайдером. Два аккаунта не сливаются. На сайт не выложено, коммита нет.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts` → 0, 41 тест.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/auth/service/auth-service.ts`, `src/modules/auth/service/index.ts`, `src/modules/auth/__tests__/auth-service.test.ts`, `src/app/[locale]/auth/callback/route.ts`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: нет. D390 не разрешает слияние; вход в уже существующий аккаунт — тот шаг, который текст ошибки только описывал.
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-12] — компания и портфолио на этой платформе (D400) — DONE (локально, не выложено)

- Сделано: `/company` и `/portfolio` больше не кадры выключенных проектов Vercel. Текст компании взят из `theonyxiesss/Intgetion` `index.html`. Текст портфолио взят из локальной папки с canonical `theonyxis.vercel.app` и из `theonyxiesss/mylendingonyxiss` (тот же текст). Обе страницы с видимым h1, title, description, canonical и hreflang. `noindex` снят. Оба пути в карте сайта. Чужой кадр для этих адресов больше не разрешён. Форма заявки и чат старого сайта компании не переносились. На сайт не выложено, коммита нет.
- Команды проверки: `pnpm exec vitest run src/lib/embedded-sites.test.ts src/lib/security.test.ts src/messages/messages.test.ts` → 0, 40 тестов. `pnpm exec tsc --noEmit` → 0. `pnpm exec eslint --max-warnings 0` по изменённым ts/tsx → 0.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/app/[locale]/company/page.tsx`, `src/app/[locale]/portfolio/page.tsx`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `src/app/sitemap.ts`, `src/lib/embedded-sites.ts`, `src/lib/embedded-sites.test.ts`, `src/lib/security-headers.ts`, `src/lib/security.test.ts`, `src/proxy.ts`, удалён `src/components/shell/embedded-site.tsx`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: D400 отменяет кадр и noindex из D388 для этих страниц. h1 портфолио стоит перед блоком связи, хотя поздний коммит источника ставил связь выше. Ссылки на удалённые `*.vercel.app` ведут на страницы этой платформы.
- OPEN QUESTION: перевода компании не было; у портфолио были только en и ru. В es, pt-BR, de, fr и it оставлен английский текст источника. Нужен ли приём заявки на `/company` — не решено, пока только ссылки из источника.
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-12] — имя Google на экране согласия — BLOCKED

- Сделано: код не менялся. Вход Google — `signInWithOAuth`, привязка — `linkIdentity`, оба через клиент Supabase Auth. `redirectTo` — `/{locale}/auth/callback` на сайте. Строка «Перейти в додаток …» — хост callback Supabase, не имя приложения. Имя `INTGETION JOB LIST` в Google Cloud не ставилось: `gcloud` не установлен, каталога `%APPDATA%\gcloud` нет, Firebase CLI без входа, вкладка консоли не открылась. `auth.intgetion.com` не включался, план Supabase не менялся, DNS не менялся, X не трогали. Коммита, выкладки, покупки и миграций нет.
- Команды проверки: поиск `gcloud` — нет. `GOOGLE_APPLICATION_CREDENTIALS` не задан. `firebase_list_projects` — нет входа. Браузер агента сессию консоли не показал.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `docs/OPEN_TASKS.md`, `docs/CURRENT.md`, `docs/how-it-works/auth.md`, эта запись. `docs/DECISIONS.md` не менялся: нового выбора основателя нет, хост не переименован.
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: основатель сам открывает Google Cloud → проект OAuth-клиента → Google Auth Platform → Branding (или APIs & Services → OAuth consent screen) и ставит App name `INTGETION JOB LIST`. Хост в «Перейти в додаток» останется хостом Supabase, пока не будет отдельной команды на платный домен.

## [2026-10-12] — убрать «Подходящие» из меню (D399) — DONE (локально, не выложено)

- Сделано: у гостя и кандидата верхняя полоса — «Вакансии» и «Тарифы». Пункт `/matches` снят и с нижней полосы телефона. Страница `/matches` и ссылки в письмах остаются. Меню работодателя не менялось.
- Команды проверки: `pnpm exec eslint src/components/shell/header.tsx src/components/shell/bottom-nav.tsx --max-warnings 0` → 0. В браузере на `http://localhost:3001/ru` верхняя полоса и меню телефона: «Вакансии», «Тарифы», без «Подходящие».
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/components/shell/header.tsx`, `src/components/shell/bottom-nav.tsx`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: D399
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-12] — один пост канала за тик (D395) — DONE (локально)

- Сделано: `runJobsAlert` за один тик cron отправляет не больше одного поста. Расписание `/api/cron/telegram` оставлено `*/5 * * * *`, поэтому между постами около 5 минут. Остаток очереди ждёт следующие тики. Сон внутри запроса не добавлялся. Метка по-прежнему пишется только после ответа sender `"sent"`. В канал ничего не отправлено, `jobs_alert_sent_at` не сбрасывался. На сайт не выложено.
- Команды проверки: `pnpm exec vitest run src/modules/jobs/__tests__/jobs-alert.test.ts` → 0, 17 тестов. `pnpm exec tsc --noEmit` → 0. `pnpm exec eslint` по `jobs-alert.ts` и `jobs-alert.test.ts` → 0.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/jobs/service/jobs-alert.ts`, `src/modules/jobs/__tests__/jobs-alert.test.ts`, `docs/tz/21-jobs-alert.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись. `vercel.json` не менялся. Не закоммичено и не выложено.
- Отклонения от ТЗ: D395 — раньше за тик было не больше 20 постов из-за таймаута `sendMessage`. Существующий тест пачки за один вызов не требовал.
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-12] — ссылки на опубликованные вакансии (D394) — DONE (локально)

- Сделано: под описанием на `/jobs/[id]` до четырёх ссылок на другие уже опубликованные вакансии, включая импорт. Сначала та же категория, затем общий навык, затем та же компания; если таких меньше трёх — последние опубликованные. Текущая вакансия не входит. Пустой список не показывает заголовок. На опубликованной странице этот блок вместо «Похожих вакансий»; у закрытой вакансии похожие остаются. JobPosting у импорта не добавлялся. На сайт не выложено.
- Команды проверки: `pnpm exec vitest run src/modules/jobs/__tests__/related-jobs.test.ts` → 0. `pnpm exec tsc --noEmit` → 0. `pnpm exec eslint` по изменённым файлам → 0. Вкладку браузера открыть не удалось. Страница `http://localhost:3000/jobs/ad447ae1-749f-45e4-8025-b45c51ab04a5` отдала «Other jobs» и четыре ссылки на другие `/jobs/`, без JobPosting.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/modules/jobs/service/related-jobs.ts`, `src/modules/jobs/ui/related-jobs.tsx`, `src/modules/jobs/service/index.ts`, `src/app/[locale]/jobs/[id]/page.tsx`, `src/modules/jobs/__tests__/related-jobs.test.ts`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись. Не закоммичено и не выложено.
- Отклонения от ТЗ: D394
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-12] — свои знаки меню телефона (D393) — DONE (локально)

- Сделано: вместо глифов Lucide у каждого адреса меню телефона свой геометрический знак. Подпись остаётся в одну строку. Широкая полоса шапки и нижняя полоса кандидата не менялись. На сайт не выложено.
- Команды проверки: `pnpm exec vitest run src/components/shell/nav-icons.test.ts` → 0, 2 теста. `pnpm exec tsc --noEmit` → 0. `pnpm exec eslint` по `nav-icons.tsx`, `mobile-nav.tsx` и тесту → 0. В Chrome на 390 и 320 px меню гостя открывается, у шести строк свои знаки 24 px, подписи в одну строку. «Тарифы» открывает `/ru/pricing`, меню закрывается.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/components/shell/nav-icons.tsx` (вместо `nav-icons.ts`), `src/components/shell/mobile-nav.tsx`, `src/components/shell/nav-icons.test.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись. Не закоммичено и не выложено.
- Отклонения от ТЗ: D393 — знаки меню не из Lucide, хотя в DESIGN библиотека иконок одна
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-12] — знаки у пунктов мобильного меню (D392) — DONE (локально)

- Сделано: в полноэкранном меню телефона у каждого пункта слева знак 24 px. Подпись остаётся. Длинные подписи держатся в одну строку. Широкая полоса шапки по-прежнему текст. На сайте не выложено.
- Команды проверки: `pnpm exec vitest run src/components/shell/nav-icons.test.ts` → 0, 2 теста. `pnpm exec tsc --noEmit` → 0. `pnpm exec eslint` по трём файлам меню → 0. `pnpm test` → 1: 7 падений не из этого шага (письма без `NEXT_PUBLIC_SITE_URL` в этой оболочке, таймаут `reachesAutoPause`). В браузере на 390 и 320 px меню открывается, у пунктов есть знаки, «Тарифы» уходит на `/ru/pricing` и меню закрывается.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/components/shell/mobile-nav.tsx`, `src/components/shell/nav-icons.ts`, `src/components/shell/nav-icons.test.ts`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись. Не закоммичено и не выложено.
- Отклонения от ТЗ: D392 — в DESIGN 8.11 у пункта меню не было знака
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-11] — кнопка бота не сбрасывает уже вошедшего на вход — DONE (локально)

- Сделано: страница входа и регистрации, если сессия уже есть и нет ошибки ссылки, уводит на `next` (чат или касса) либо на главную. Если Telegram уже привязан, кнопка подтверждения открывает чат сайта, а не вход.
- Команды проверки: `pnpm exec vitest run src/components/auth/login-next.test.ts src/modules/bot/__tests__/telegram-agent.test.ts` → 0, 19 тестов. Полный `pnpm test`, `pnpm lint` и `pnpm typecheck` в этой сессии не гонялись.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `login/page.tsx`, `register/page.tsx`, `login-next.ts`, `telegram-agent.ts`, тесты, `docs/CURRENT.md`, эта запись. Не закоммичено.
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-12] — поисковый ход Spoki (D397) — DONE (локально, не выложено)

- Сделано: когда поиск уже можно сделать, сервер сам вызывает `search_jobs` и показывает одну вакансию, затем спрашивает, подходит ли она. «Да» записывает ответ и не вызывает `apply_to_job`. «Нет» пропускает номер и ищет следующую; вопрос про зарплату или формат — только если список повторился бы. Тред `?job=` в первом ходе остаётся на открытой вакансии. Сопроводительное и вопросы работодателю из ответа убираются, если человек их не просил. Промпт версии 11. Писем работодателям нет.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 1: предупреждение `@next/next/no-img-element` в `src/modules/jobs/ui/hire-form.tsx` (файл этой сессии не менялся, он уже на `origin/master`). `pnpm test` → 1: `src/content/legal/legal.test.ts` расходится только переводами строк CRLF в рабочей копии Windows (тексты после снятия `\r` совпадают, файлы не менялись); `decide.test.ts` один раз не уложился в 5 с при полном параллельном прогоне и отдельно прошёл (0). Тесты хода: `fit`, `job-focus`, `memory`, `search-loop`, `conversation-leak` → 0.
- P-тесты подфазы: австралийская вакансия по-русски заканчивается вопросом «подходит ли», без сопроводительного и без `apply_to_job` ✅; два поиска не повторяют пропущенный номер ✅; вежливое «да» не вызывает `apply_to_job` ✅; открывашка больше не предлагает письмо и вопросы ✅
- Миграции: нет
- Изменённые файлы: `job-focus.ts`, `fit.ts`, `conversation.ts`, `memory.ts`, `tools.ts`, `prompts/system.ts`, тесты бота, `docs/tz/12-bot.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись. Ветка `claude/spoki-fit`, не выложено.
- Отклонения от ТЗ: D397. D381, D385 и D386 не переписывались.
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Связь с работодателем не начинать.

## [2026-10-12] — сессия не слетает при двух обновлениях (D398) — NOT DONE

- Сделано: один refresh на процесс. Второй запрос ждёт и берёт уже полученную сессию. «already used» заново читает куку: если сессия новее, человек остаётся вошедшим, `signOut` не вызывается. Сеть, 5xx и только что повёрнутый токен куки не стирают. Server Component refresh не отправляет. `/api/*` обновляет сессию в proxy, где запись доходит до ответа. Куски `sb-*`, включая `.0` и `.1`, с теми же флагами, что D314. Выход из этого браузера — `scope: "local"`. Глобальный выход остаётся на удалении аккаунта и у админа.
- Команды проверки: `pnpm typecheck` → 0. `pnpm lint` → 1: предупреждение `@next/next/no-img-element` в `src/modules/jobs/ui/hire-form.tsx:318`, файл этой сессией не менялся. `pnpm test` → 1: `src/content/legal/legal.test.ts` — markdown в рабочей копии с CRLF, строки в `legal.json` с LF; файл этой сессией не менялся. Остальные 922 теста прошли, включая гонку двух refresh, сеть и явный выход. e2e не запускался (Chromium на этой машине часто нет).
- P-тесты подфазы: два одновременных refresh одного токена не кончают сессию ✅; сеть не стирает живую куку ✅; явный выход снимает ✅; Server Component refresh не шлёт ✅
- Миграции: нет
- Изменённые файлы: `src/lib/supabase/session-refresh.ts`, `session-client.ts` и их тесты, `src/lib/supabase/proxy.ts`, `src/lib/supabase/server.ts`, `src/proxy.ts`, `src/proxy.test.ts`, `src/modules/auth/service/auth-service.ts`, `src/modules/auth/__tests__/auth-service.test.ts`, `src/app/api/me/route.ts`, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись
- Отклонения от ТЗ: номер сдвинут с D392 на D398, потому что D392 уже значит знаки меню. D314–D322 и D328 не переписывались
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде. `pnpm lint` и `pnpm test` на этой машине не выходят с 0 из-за файлов, которых эта сессия не касалась.

## [2026-10-11] — картинка и публикация админом на форме вакансии (D391) — DONE (локально)

- Сделано: на `/post-job` есть загрузка картинки. Файл сохраняется как логотип компании, те же типы и предел 2 МБ. У платформенного админа кнопка «Разместить вакансию» сразу ставит вакансию в список. У остальных она по-прежнему ждёт админа.
- Команды проверки: ниже, вместе с тестом формы.
- Миграции: нет
- Изменённые файлы: `hire-form`, страница `/post-job`, `hire-post`, семь каталогов. Не закоммичено и не выложено.
- Отклонения от ТЗ: D391
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя.

## [2026-10-11] — форма размещения вакансии, проверка только админом (D391) — DONE (локально)

- Сделано: `/post-job` для вошедшего — одна форма выклада вакансии. Пустое место значит удалённо, зарплата обязательна, отклик почтой, внешней формой или на сайте, до трёх вопросов дописываются в описание. Отправка и кнопка у черновика ставят вакансию в очередь. В ленту её переводит только админ. Оплату, пакеты, видео и скрытие зарплаты с чужой страницы не переносили.
- Команды проверки: `pnpm exec vitest run src/modules/jobs/__tests__/hire.test.ts src/modules/jobs/__tests__/status-machine.test.ts src/messages/messages.test.ts` → 0, 22 теста. `pnpm exec tsc --noEmit` → 0. Полный `pnpm test` и `pnpm lint` в этой сессии не гонялись.
- P-тесты подфазы: вилка в minor units, пустое место → remote, вопросы, отказ при перевёрнутой зарплате, member publish/extend → pending_moderation ✅
- Миграции: нет
- Изменённые файлы: форма `/post-job`, `hire-form`, схема и сервис найма, очередь через `status-machine`, семь каталогов, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись. Не закоммичено и не выложено.
- Отклонения от ТЗ: D391 вместо самопубликации проверенной компании из D12 и раздела 14.4
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя. Выкладка только по отдельной команде.

## [2026-10-11] — имя Google и домен auth — BLOCKED

- Сделано: домен `auth.intgetion.com` не регистрировался. Организация проекта `intgetion-dev` на плане Free, а свой домен Supabase — платное дополнение только на платном плане. DNS не менялся: записи `intgetion.com`, `www` и `admin` не трогались, отдельной записи `auth` нет. Старый callback `*.supabase.co` по-прежнему отвечает переходом на выбор аккаунта Google, пользователь не создавался. Имя приложения на экране согласия не менялось.
- Команды проверки: организация Supabase — `plan=free`. `supabase domains` без входа в CLI. Vercel DNS `intgetion.com` — 9 записей, `auth` среди них нет. `GET` authorize Google → 302 на `accounts.google.com`, redirect — прежний callback Supabase.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, эта запись. Код приложения не менялся.
- Отклонения от ТЗ: нет
- OPEN QUESTION: готов ли основатель перевести организацию `intgetion-dev` на платный план и включить дополнение Custom Domain ($10 в месяц, spend cap его не покрывает).
- Следующая подфаза: по команде основателя. Сначала план, потом домен, потом redirect Google, потом имя `INTGETION` на экране согласия.

## [2026-10-11] — привязка чужого Google показывает причину (D390) — DONE

- Сделано: если Google или X уже принадлежит другому аккаунту, страница аккаунта говорит об этом, а не «не удалось привязать». Два аккаунта не сливаются.
- Команды проверки: `pnpm exec vitest run src/modules/auth/__tests__/auth-service.test.ts src/messages/messages.test.ts` → 0, 53 теста.
- Миграции: нет
- Изменённые файлы: callback, `auth-service`, тест, семь каталогов, `docs/DECISIONS.md`, эта запись.
- Отклонения от ТЗ: D390
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя.

## [2026-10-11] — способы входа на странице профиля — DONE (локально)

- Сделано: блок «Способы входа» (почта, Telegram, Google, X) стоит на `/profile` и остаётся в Настройки → Аккаунт. Гость с `/profile` уходит на вход.
- Команды проверки: `pnpm exec tsc --noEmit` → 0. В браузере `/profile` без сессии открывает `/login`. Кнопки привязки под вошедшим пользователем не нажимались.
- Миграции: нет
- Изменённые файлы: `src/components/settings/account-sign-in.tsx`, `src/app/[locale]/profile/page.tsx`, `src/app/[locale]/settings/account/page.tsx`, `docs/CURRENT.md`, эта запись. Не закоммичено.
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: по команде основателя.

## [2026-10-11] — компания и портфолио внутри сайта (D388) — DONE (локально)

- Сделано: основатель поправил: не внешние ссылки, а страницы этого сайта. `/company` показывает сайт компании, `/portfolio` — портфолио. В футере у них своя группа. Кадр чужого сайта разрешён только на своей странице. В поиск адреса не добавлены.
- Команды проверки: `pnpm exec vitest run src/lib/embedded-sites.test.ts src/lib/security.test.ts src/messages/messages.test.ts` → 0, 41 тест. Локально `/company` и `/portfolio` → 200. Кадр компании разрешён только на `/company`, кадр портфолио только на `/portfolio`, на главной чужого кадра нет. В браузере футер «Sites» открывает `/portfolio`, кадр указывает на портфолио.
- P-тесты подфазы: embedOriginForPath, совпадение префиксов языков, buildCsp frame-src, ключи каталогов ✅
- Миграции: нет
- Изменённые файлы: `src/lib/embedded-sites.ts`, `src/lib/security-headers.ts`, `src/proxy.ts`, `src/components/shell/footer.tsx`, `src/components/shell/embedded-site.tsx`, `src/app/[locale]/company/page.tsx`, `src/app/[locale]/portfolio/page.tsx`, семь каталогов, `docs/DECISIONS.md`, `docs/CURRENT.md`, эта запись. Не закоммичено и не выложено.
- Отклонения от ТЗ: D388
- OPEN QUESTION: нет
- Следующая подфаза: выкладка только по команде основателя.

## [2026-10-11] — карточка Jobs Alert (D389) — DONE

- Сделано: следующая неотправленная вакансия канала Jobs Alert собирается короткой английской карточкой (D389). Место из `work_format`, локации и кода страны. Зарплата коротко через `toMoneyDto` и ту же шкалу minor units; `formatMoneyDto` не менялся. Обе суммы пустые — строки денег нет, «не указана» не пишется. Свежесть считается в момент отправки от самого раннего `job_status_history.created_at` с `to_status = 'published'`. Ссылка `https://intgetion.com/jobs/{id}`. В конце строка `Or forward to a friend!`. `jobs_alert_sent_at` не сбрасывался. В канал не отправлялось, на сайт не выкладывалось, в `master` не вливалось.
- Команды проверки (`NEXT_PUBLIC_SITE_URL=http://localhost:3000` для полного прогона): `pnpm exec vitest run src/modules/jobs/__tests__/jobs-alert.test.ts` → 0 (16 прошли). `pnpm typecheck` → 0. `pnpm lint` → 0. `pnpm test` → 1: упал только `src/modules/moderation/__tests__/decide.test.ts` по таймауту 5000 мс (файл не менялся, тест не ослаблен); 896 прошли, 1 пропущен. До этого полный прогон один раз упал на `src/content/legal/legal.test.ts`: свежий worktree при `core.autocrlf=true` отдал `docs/content/legal-*.md` с CRLF, тогда как `legal.json` и та же пара файлов в основной папке — LF. Текст не менялся. После возврата к LF этот тест прошёл; файлы возвращены checkout и в коммит не входят.
- P-тесты подфазы: нет отдельных P-номеров. Юнит `jobs-alert.test.ts`.
- Миграции: нет.
- Изменённые файлы: `src/modules/jobs/service/jobs-alert.ts`, `src/modules/jobs/__tests__/jobs-alert.test.ts`, `docs/tz/21-jobs-alert.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет. В наброске основателя было «one minute ago»; правило и тест пишут `1 minute ago`.
- OPEN QUESTION: нет.
- Следующая подфаза: не начинать. Не постить в Telegram и не выкладывать, пока основатель не скажет.

## [2026-10-11] — пачка бота: D381, язык сообщения, разговор вместо анкеты — DONE

- Сделано: пачка бота влита в `master` в порядке `cursor/telegram-jobs` (`6f47a58`, D381), `cursor/bot-language` (`3d7c8ab`, язык последнего сообщения, D385) и `cursor/bot-greet` (`b4619e2` поверх `9508e0b`, разговор вместо анкеты, D386). Номера D381, D385 и D386 не менялись и второй раз не создавались. Промпт один, версия 10 (на master до вливания была 9). В Telegram сырой текст инструмента не показывается: если черновик можно искать, сервер вызывает `search_jobs`, ответ «название — компания» и кнопка. Бот отвечает языком последнего сообщения и не запирает ответ в `language_code`. На «привет» здоровается и спрашивает, чем помочь, без страны. Если беседа уже идёт, ответ не начинается с приветствия. Если поля в аккаунте нет, говорит, что поле можно назвать в чате. Страну спрашивает только когда человек просит вакансии и без этого факта поиск не сделать. Цены, инструменты и запрет отклика без карточки остались. Французский и итальянский не откатывались. Немецкий, санкции D380, кнопка ассистента D382, живой импорт и приём Tron и Solana D384 остались.
- Команды проверки (`NEXT_PUBLIC_SITE_URL=http://localhost:3000`): `pnpm typecheck` → 0, `pnpm lint` → 0, `pnpm test` → 0 (893 прошли, 1 пропущен).
- P-тесты подфазы: нет отдельных P-номеров. Юниты `conversation-leak`, `leaked-tool`, `telegram-agent`, `memory` (язык и приветствие).
- Миграции: нет. В трёх ветках нового sql нет. `pnpm db:migrate` не запускался.
- Изменённые файлы: вливание трёх веток, `src/modules/bot/prompts/system.ts` (сведение в версию 10), `src/modules/bot/__tests__/memory.test.ts`, `src/modules/bot/__tests__/conversation-leak.test.ts` (`jobId: null`, чтобы фикстура D381 сошлась с беседой вакансии D382), `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет. Ветка приветствия ждала версию 11, потому что поднимала промпт дважды у себя. На master до вливания версия была 9, поэтому после сведения одна версия 10. Проверки поведения приветствия не ослаблены.
- OPEN QUESTION: нет. Имя выкладки — в отчёте сессии, если она станет READY после этого коммита. В репозиторий имя выкладки вторым коммитом не пишется.
- Следующая подфаза: не начинать. Телефонный Mini App, D328, карты, автоматический возврат, более сильная модель, WalletConnect и новые языки не начинать.

## [2026-10-11] — французский /fr и итальянский /it (D374, D379) — DONE

- Сделано: влит `claude/locale-it` (`9d06683`, французский `744348e`) в `master`. Французский на `/fr`: `src/messages/fr.json`, миграция `0044_locale_fr.sql`, решение D374. Итальянский на `/it`: `src/messages/it.json`, миграция `0045_locale_it.sql`, решение D379. Номера не менялись и второй раз не создавались. Немецкий коммит `455e471` уже был в истории. Старые ветки от `f89ad97` не вливались. На `master` остались немецкий D373, D378, санкции D380, кнопка ассистента D382, живой импорт и приём Tron и Solana D384. В `fr.json` и `it.json` добавлены только ключи, которых в ветке не было: кнопка ассистента и подписи Tron и Solana, перевод с текущего `en.json`. Юридические тексты взяты из ветки; юрист и юрлицо не добавлялись.
- Команды проверки (`NEXT_PUBLIC_SITE_URL=http://localhost:3000`): `pnpm typecheck` → 0, `pnpm lint` → 0, `pnpm test` → 1: упал только `src/modules/moderation/__tests__/decide.test.ts` по таймауту 5000 мс (файл не менялся, тест не ослаблен); 881 прошёл, 1 пропущен.
- P-тесты подфазы: каталоги `fr` и `it` (те же ключи, что у `en`), юридические `fr` и `it`, письма и бот (из ветки; полный прогон выше).
- Миграции: сверка `public.schema_migrations` с `src/db/migrations` — ждали только `0044_locale_fr.sql` и `0045_locale_it.sql`. `0043`, `0046` и `0047` уже в базе. В базе есть старое имя `0020_telegram_login.sql` без файла в папке; это не ожидающая миграция. `pnpm db:migrate` → 0, в логе `applied: 0044_locale_fr.sql` и `applied: 0045_locale_it.sql`.
- Изменённые файлы: вливание `claude/locale-it`, ключи ассистента и Tron/Solana в `fr.json` и `it.json`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет. Основатель сказал влить французский и итальянский одним шагом.
- OPEN QUESTION: проверка юристом французского и итальянского текста — как в D374 и D379. SHA этого коммита и имя выкладки — в отчёте сессии, если выкладка станет READY после коммита.
- Следующая подфаза: только по команде. Telegram D381, карты, автоматический возврат, более сильная модель, WalletConnect, телефонный Mini App и D328 не начинать.

## [2026-10-11] — немецкий /de (D373) — DONE

- Сделано: влит `claude/locale-de2` (`455e471`) в `master`. Немецкий на `/de`: `src/messages/de.json`, миграция `0043_locale_de.sql`, решение D373 тем же номером, без второго D373. Старая ветка `claude/locale-de` не вливалась. На `master` остались D378, санкции D380, кнопка ассистента D382, живой импорт и приём Tron и Solana D384. В `de.json` добавлены 15 ключей, которых в ветке не было: кнопка ассистента и подписи Tron и Solana. Французский и итальянский не вливались. Миграции `0044` и `0045` не копировались. Юридический текст взят из ветки; юрист и юрлицо не добавлялись.
- Команды проверки (`NEXT_PUBLIC_SITE_URL=http://localhost:3000`): `pnpm typecheck` → 0, `pnpm lint` → 0, `pnpm test` → 1: упал только `src/modules/moderation/__tests__/decide.test.ts` по таймауту 5000 мс (файл не менялся, тест не ослаблен); 873 прошли, 1 пропущен.
- P-тесты подфазы: каталог `de`, юридический `de`, письмо `de`, бот `de`, seo `/de` (из ветки; полный прогон выше).
- Миграции: сверка `public.schema_migrations` с `src/db/migrations` — ждал только `0043_locale_de.sql`. `0046` и `0047` уже в базе. В базе есть старое имя `0020_telegram_login.sql` без файла в папке; это не ожидающая миграция. `pnpm db:migrate` → 0, в логе `applied: 0043_locale_de.sql`.
- Изменённые файлы: вливание `claude/locale-de2`, 15 ключей в `de.json`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: Impressum / BDSG для `/de` — как в D373, решает юрист. SHA этого коммита и имя выкладки — в отчёте сессии, если выкладка станет READY после коммита.
- Следующая подфаза: только по команде. `fr`, `it`, Telegram D381, карты, автоматический возврат, более сильная модель, WalletConnect, телефонный Mini App и D328 не начинать.

## [2026-10-11] — чат с вакансии (D382) — DONE

- Сделано: на странице вакансии кнопка «Поговорить с ассистентом» открывает `/chat?job={id}`. У вошедшего отдельная беседа на `user_id` и `job_id` (миграция `0047`, уже на облаке с 2026-10-11). В шапке чата название, компания и возврат. Первая реплика называет вакансию. Отклик только после явной просьбы и карточки подтверждения. Код выложен этим коммитом.
- Команды проверки (`NEXT_PUBLIC_SITE_URL=http://localhost:3000`): `pnpm typecheck` → 0, `pnpm lint` → 0, `pnpm test` → 1: упал только `src/modules/moderation/__tests__/decide.test.ts` по таймауту 5000 мс (файл не менялся, тест не ослаблен); 845 прошли, 1 пропущен.
- P-тесты подфазы: нет отдельных P-номеров. Юнит `job-focus.test.ts`.
- Миграции: `0047_bot_job_focus.sql` (на облаке до этого коммита; `pnpm db:migrate` не запускался).
- Изменённые файлы: страница вакансии, чат, беседы бота, каталоги en/ru/es/pt-BR, D382, ТЗ бота, CURRENT, MISSION_LOG.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Выкладка: этим коммитом на master.
- Следующая подфаза: по команде. Живой импорт, языки de/fr/it, Telegram D381, Mini App и D328 не начинать.

## [2026-10-11] — Клоду все оставшиеся шаги одним блоком — DONE

- Сделано: основатель сказал не отделять хвосты от Клода. Блок §15 в `docs/tz/24-claude-held.md` заменяет §14. Одно задание: D378, санкции, живой импорт, языки `de` → `fr` → `it`, Telegram D381. Код продукта не менялся.
- Команды проверки: нет, код продукта не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/24-claude-held.md`, `docs/tz/25-held-tails.md`, `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, блок §15. Отсюда эти шаги не делать.

## [2026-10-11] — Клоду блок на выкладку D378 — DONE

- Сделано: основатель попросил блок Клоду на выполнение. В `docs/tz/24-claude-held.md` §14 — только сессия 1: коммит и выкладка уже написанного D378. Санкции, импорт, языки и Telegram в блок не входят. Код продукта не менялся, коммита нет.
- Команды проверки: нет, код продукта не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/24-claude-held.md`, `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, D378. Санкции не начинать.

## [2026-10-11] — порядок следующих сессий — DONE

- Сделано: основатель попросил разложить дальнейшие действия. Порядок записан в `docs/tz/25-held-tails.md`: D378 на сайт, затем санкции, затем живой импорт, затем языки `de` → `fr` → `it`, затем Telegram D381. Код не писался, флаг импорта не включался, коммита нет.
- Команды проверки: нет, код продукта не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/25-held-tails.md`, `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет. Каждая сессия ждёт отдельную команду.
- Следующая подфаза: D378, только когда основатель скажет коммитить и выкладывать.

## [2026-10-11] — план хвостов сверен — DONE

- Сделано: план по `docs/tz/25-held-tails.md` сверен с папкой `sanctions`. Тесты и D380 там есть, коммита нет. В карте и CURRENT убрана устаревшая формулировка «нет тестов и нет D380». Живой импорт не включался. Число 113 импортированных вакансий в документах проекта нет.
- Команды проверки: нет, код продукта не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/25-held-tails.md`, `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: включать ли живой импорт отдельной командой, и вливать ли языки.
- Следующая подфаза: не начинать без команды основателя.

## [2026-10-11] — каталог уже на сайте — DONE

- Сделано: проверка прода. Выкладка `dpl_GScR537HJDLLBJ2jZBqDAvnHownu` уже на коммите `42412c5` и в состоянии READY. Повторно не выкладывали. Главная и вакансия `b71d30f4-1ed7-43da-aed6-6653ae17b2c7` ответили 200, страница вакансии открылась. Локальный D378 не коммитился. Флаги не менялись.
- Команды проверки: HTTP GET главной и одной вакансии → 200.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: санкции у Клода. Строки карты в `docs/tz/25-held-tails.md` не начинать без команды.

## [2026-10-11] — карта хвостов, без кода — DONE

- Сделано: основатель попросил выложить пачку отдельным агентом, санкции отдать Клоду, а Tron/Solana, живой импорт, языки и дыры оплаты только записать. Написаны [docs/tz/25-held-tails.md](docs/tz/25-held-tails.md): карта, границы по каждой строке и один промпт на будущий план. Код продукта не менялся. Флаг импорта не включался. Коммита нет.
- Команды проверки: нет, код продукта не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/25-held-tails.md`, `docs/tz/INDEX.md`, `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет. Порядок строк карты основатель выберет отдельно.
- Следующая подфаза: не начинать, пока нет отдельной команды на одну строку карты.

## [2026-10-09] — санкционный список не закрыт — DONE

- Сделано: Клод остановил Tron и Solana как BLOCKED, код приёма не писал. Он же написал, что санкционный список оборвался: в папке `sanctions` есть миграция `0046`, разбор OFAC, сверка и cron, но нет тестов, решения D380, MISSION_LOG и CURRENT. Следующий блок — дописать только этот хвост в той же папке. Tron не начинать.
- Команды проверки: нет, код продукта в основной папке не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: очередь Клода, CURRENT.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, хвост санкционного списка. Основная папка это не делает.

## [2026-10-09] — Клоду следующий блок: Tron и Solana остановка — DONE

- Сделано: основатель сказал, что санкционный список есть. Код в `Integetion jobs sanctions`, без коммита и без выкладки. Следующий блок Клоду — не писать приём Tron и Solana. Адресов нет, отчёт `BLOCKED`. Карты, сильная модель и автоматический возврат не начинать.
- Команды проверки: нет, код продукта в основной папке не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: очередь Клода, CURRENT.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, остановка по сетям без адресов. Основная папка это не делает.

## [2026-10-09] — Клоду следующий блок: санкционный список — DONE

- Сделано: основатель сказал, что итальянский Клод сделал. Сессия 3 закрыта его словом: код в `Integetion jobs locale-it`, ещё без коммита. Французский уже в коммите `744348e`. Следующая одна сессия — санкционный список от `origin/master`, не от языковых веток. Решение D380, миграция `0046`. Деньги не двигать. Tron и Solana этим блоком не начинаются.
- Команды проверки: нет, код продукта в основной папке не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: очередь Клода, CURRENT.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, санкционный список. Основная папка это не делает.

## [2026-10-09] — Telegram: текст вакансии и кнопка — DONE (не выложено)

- Сделано: агент закрыл сырой `<tool_call>` в Telegram. Если модель пишет вызов текстом, текст отбрасывается. Когда роль и страна или формат уже известны, сервер сам ищет вакансии. В ответе строка «название — компания» и кнопка на страницу. Для удалёнки страна поиск не сужает. Промпт версии 9 не менялся. Та же разметка вырезается из веб-чата. Коммита нет, на сайт не выкладывалось. Страница вакансии на intgetion.com этим не чинилась.
- Команды проверки: в папке `telegram-reply` — `pnpm typecheck` → 0; vitest бота → 44 прошло, 1 пропущен; полный `pnpm test` красный только на старом таймауте `decide.test.ts`.
- P-тесты подфазы: нет живой отправки в Telegram.
- Миграции: нет.
- Изменённые файлы: `leaked-tool.ts`, разговор бота, Telegram-агент, тесты, D381. Всё в `Integetion jobs telegram-reply`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-09] — Telegram агенту, Клоду снова итальянский — DONE

- Сделано: основатель показал переписку в Telegram. Бот прислал сырой текст вызова `offer_step` вместо вакансии и кнопки. Эту правку делает агент в отдельной папке `telegram-reply`, не основная папка. Основатель также сказал, что Клод закончил, и попросил блок. Папки `locale-it` нет, французский всё ещё незакоммичен в `locale-fr2`, поэтому следующий блок Клоду — итальянский, не санкционный список.
- Команды проверки: нет, код продукта в основной папке не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: очередь Клода не менялась, CURRENT.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у агента Telegram; у Клода итальянский. Основная папка это не делает.

## [2026-10-09] — Клоду следующий блок: итальянский — DONE

- Сделано: основатель сказал, что французский Клод сделал. Сессия 2 закрыта его словом: код в `Integetion jobs locale-fr2`, ещё без коммита. Немецкий уже в коммите `455e471`. Следующая одна сессия — итальянский, решение D379, миграция `0045`. Сначала локальный коммит французского без push, затем папка `Integetion jobs locale-it`. Санкционный список этим блоком не начинается.
- Команды проверки: нет, код продукта не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: очередь Клода, CURRENT.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, итальянский. Основная папка это не делает.

## [2026-10-09] — Клоду следующий блок: французский — DONE

- Сделано: основатель сказал, что немецкий Клод сделал, и попросил следующий блок. Сессия 1 закрыта его словом: код в `Integetion jobs locale-de2`, ещё без коммита. Следующая одна сессия — французский. Сначала локальный коммит немецкого без push, затем папка `Integetion jobs locale-fr2` от этой ветки. Старую `claude-held` не продолжать. Итальянский этим блоком не начинается.
- Команды проверки: нет, код продукта не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: очередь Клода, CURRENT.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, французский. Основная папка это не делает.

## [2026-10-09] — Клоду следующий блок: немецкий — DONE

- Сделано: основатель сказал, что карточки Spoki Клод сделал, и попросил следующий блок. Сессия 0 в очереди закрыта его словом: код D377 в `Integetion jobs spoki-cards`, без коммита и без выкладки, в эту папку больше не возвращаться. Следующая одна сессия — немецкий заново от `origin/master`, новая папка `Integetion jobs locale-de2`, ветка `claude/locale-de2`. Старую `claude/locale-de` не вливать. D373 не занимать вторым номером. Французский этим блоком не начинается.
- Команды проверки: нет, код продукта не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: очередь Клода, CURRENT.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, немецкий. Основная папка это не делает.

## [2026-10-09] — блок задач для Клода — DONE

- Сделано: основатель попросил блок задач для Клода. В `docs/tz/24-claude-held.md` записан порядок и текст для вставки. Сейчас одна сессия: доделать D377 в уже открытой папке `Integetion jobs spoki-cards`. Немецкий и французский на ветках от `f89ad97` на сайт не вливать и не продолжать в `claude-held`. Дальше по одной сессии только после команды «следующая»: языки заново от актуального master, затем санкционный список. Карты, сильная модель и автоматический возврат не в блоке.
- Команды проверки: нет, код продукта не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: очередь Клода, CURRENT.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, закрыть карточки чата. Основная папка это не делает.

## [2026-10-09] — ссылка отклика только http или https — DONE (не выложено)

- Сделано: адрес отклика, ссылка на оригинал и адреса компании сохраняются и открываются только как `http` или `https`. Уже лежащий в базе адрес другой схемы на странице не становится ссылкой. Импорт с таким адресом помечается как отклонённый и адрес не сохраняется. Санкционный список не включался: списка адресов нет.
- Команды проверки: vitest ссылок, импорта и отклика → 42 прошло; eslint по затронутым файлам → 0. На локальной вакансии Ihsan Pay «Оригинал» и «Откликнуться» ведут на https.
- P-тесты подфазы: нет живой публикации чужого адреса.
- Миграции: нет.
- Изменённые файлы: схемы вакансии и компании, публичная карточка, кнопка отклика, импорт, D378.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет. Шифрование контактов и условия OpenRouter остаются открытыми, как раньше.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-09] — ассистента отдаём Клоду — DONE

- Сделано: основатель просил работать над ассистентом, но задачу отдать Клоду. Одна подфаза: в веб-чате Spoki вакансии рисуются той же карточкой, что в каталоге. Языки, модель, возврат и выклад этой сессией не начинались. Промпт для вставки написан в чат.
- Команды проверки: нет, код не менялся.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: очередь Клода, CURRENT.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: у Клода, ветка `claude/spoki-cards`. Основная папка это не делает.

## [2026-10-09] — выклад пачки на сайт — DONE

- Сделано: основатель попросил собрать наработки и выложить их. В пачке: пояс компании и флаг поиска (D365), блок «Продвигается» (D366), места в команде (D367), шапка (D371), знак компании и ссылки (D372), карточки на узком экране, живой импорт четырёх API с выключенным флагом (D375), без подписи «импортировано» (D376). Миграция `0042` уже на облаке. `IMPORT_LIVE_ENABLED` этой выкладкой не включается.
- Команды проверки: `pnpm typecheck` → 0. Push `master` `815edd0..9891b25`. Выклад Vercel `dpl_7gX54do9736DwackUxXkAUwZCV68` — READY, алиас `intgetion.com`. На проде главная без слова «Импортировано», знак компании на широкой карточке 40 px.
- P-тесты подфазы: живой импорт не запускался.
- Миграции: новых нет. `0042` уже применена.
- Изменённые файлы: карточки, шапка, знак компании, импорт, каталог, документы.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-09] — без подписи «импортировано» — DONE (не выложено)

- Сделано: на главной, в каталоге, в похожих, в подборках и в совпадениях нет бейджа «Импортировано». На открытой вакансии нет строки «Импортировано из …». Фильтр «источник» из каталога убран. Старые строки снимка «Imported from …» и «Импортировано с …» на карточке и в тексте вакансии не показываются. В админке бейдж остаётся. Ссылка «Оригинал на …» и короткий абзац из наших полей остаются. Посты из X и с других сайтов источником не подключены.
- Команды проверки: vitest `public-job-text` → 2 прошло; eslint по карточкам и страницам вакансий → 0.
- P-тесты подфазы: главная, каталог `/ru/jobs` и открытая вакансия Ihsan Pay — слова «Импортировано» нет. Фильтра «источник» в каталоге нет. Ссылка «Оригинал на …» на вакансии есть.
- Миграции: нет.
- Изменённые файлы: публичная карточка, карточка совпадения, страница вакансии, каталог, DESIGN 8.5, раздел 13, D376.
- Отклонения от ТЗ: нет. D376 уточняет D372: публичный бейдж импорта больше не показывается.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-09] — знак компании на узкой карточке — DONE (не выложено)

- Сделано: на карточке уже 640 px квадрат знака 32 px, рисунок внутри остаётся 24 px. От 640 px квадрат 40 px и тот же рисунок 24 px. Блок «Похожие» (карточка около 584 px) берёт узкий знак. На телефоне имя компании остаётся рядом со знаком: на вакансии 48 px, на странице компании 64 px, кнопка «Следить» ниже и не наезжает. На сайт не выкладывалось.
- Команды проверки: Chrome на `http://localhost:3000/ru`, ширины 390 и 1280, страница вакансии с «Похожими», страницы компаний. Встроенный браузер вкладку не открыл.
- P-тесты подфазы: на 390 знак 32×32, глиф 24×24, бейдж «Импортировано» на месте; нажатие по знаку ведёт на вакансию, по имени — на компанию. На 1280 знак 40×40. Похожие: карточка 584 px, знак 32×32.
- Миграции: нет.
- Изменённые файлы: `company-mark.tsx`, страница компании, DESIGN 8.5.
- Отклонения от ТЗ: нет. В 8.5 одна фраза про 32 px и 40 px.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-09] — живой импорт четырёх API — DONE (не выложено, флаг выключен)

- Сделано: каталог может пополняться из Remotive, Himalayas, Jobicy и Remote OK. Это официальные API, показ со ссылкой и именем источника. Google Jobs источником не подключается: туда уходят только свои вакансии. Скрейпинг не делался. Без `IMPORT_LIVE_ENABLED=true` сеть не открывается, фикстуры работают как раньше. Новых вакансий за запуск не больше 15 с источника, уже сохранённые обновляются. We Work Remotely, Arbeitnow, CryptoJobsList и web3.career не включены.
- Команды проверки: vitest адаптеров и фикстур импорта → 24 прошло.
- P-тесты подфазы: живой прогон против облака не запускался, флаг выключен.
- Миграции: нет. Источник заводится при первом живом запуске. Номера 0043 и 0044 оставлены языкам.
- Изменённые файлы: адаптеры, прогон импорта, cron, решение D375, раздел 13.
- Отклонения от ТЗ: нет. Google Jobs как источник отвергнут: это не API выдачи чужих вакансий.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. Чтобы каталог начал расти, нужно включить флаг. На прод код не выкладывался.

## [2026-10-09] — знак компании и ссылки на вакансии — DONE (не выложено)

- Сделано: на карточке слева от названия квадрат 40 px. Если компания загрузила логотип, показывается он. Если нет — один из четырёх своих знаков, один и тот же у этой компании. Импорт тоже со знаком, бейдж «Импортировано» остаётся. На открытой вакансии и на странице компании тот же знак. Под именем — сайт, LinkedIn, Telegram и X, только если они сохранены. Пустые не рисуются. В форме компании появились три поля. Миграция `0042` применена к облачной базе этого проекта: колонки пустые. На сайт код не выкладывался.
- Команды проверки: `tsc --noEmit` → 0; eslint по затронутым файлам → 0; vitest знака, публичной карточки и сообщений → 18 прошло. Браузер: главная на 1280 и 390, открытая вакансия Ihsan Pay, страница компании, форма создания компании.
- P-тесты подфазы: на карточке знак 40 px, нажатие по знаку открывает вакансию, по имени — компанию. На 390 описание скрыто. На открытой вакансии знак 48 px. Соцсетей у Ihsan Pay нет — ссылок под именем нет. В форме есть LinkedIn, Telegram и X.
- Миграции: `0042_company_social_urls.sql` применена к облаку.
- Изменённые файлы: знак, карточка, публичная вакансия, страница компании, форма, схема, сообщения, D372.
- Отклонения от ТЗ: нет. В 04 и 06 дописаны колонки и публичное чтение логотипа.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-09] — карточки вакансий — DONE (не выложено)

- Сделано: карточка списка читается с телефона и с широкого экрана. Зарплата — ведущее поле: на карточке шире 640 px справа от названия, на узкой сразу под компанией. Описание на узкой скрыто. Остальные факты на узкой идут столбцом, на широкой — одним рядом. «Открыть вакансию» на широкой стоит под зарплатой и не перехватывает нажатие. В двух колонках «Похожие» карточка остаётся столбиком. Название ведёт на вакансию, имя компании — на компанию.
- Команды проверки: браузер, главная и каталог `/ru/jobs`, ширины 390 и 1280, страница вакансии с блоком «Похожие». eslint по карточке → 0.
- P-тесты подфазы: на 390 зарплата в одну строку под компанией; на 1280 зарплата справа и в одну строку; клик по компании открыл `/companies/…`, клик по названию открыл `/jobs/…`.
- Миграции: нет.
- Изменённые файлы: `job-card.tsx`, `public-job-card.tsx`, `match-card.tsx`, DESIGN 8.5.
- Отклонения от ТЗ: нет. Уточнена анатомия 8.5.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-09] — шапка не складывает кнопки — DONE (не выложено)

- Сделано: проверен уже написанный D371. На узком экране в полосе логотип, значок агента, колокол и меню. Меню открывается списком. С 1280 px подписи «Вакансии» и «Тарифы», «Разместить вакансию» — плюс. С 1536 px у этой шапки полные подписи агента и размещения, значки аккаунта рядом, без наложений. Пять русских пунктов работодателя в той же полосе на 1440 px тоже не наезжают: агент и размещение остаются значками. Языки в подвале на узком экране — короткие коды. На сайт не выкладывалось, коммита нет.
- Команды проверки: браузер на `http://localhost:3000/ru`, вошедший администратор. Ширины 360, 390, 1280, 1440, 1536. Отдельный вход гостя и живой работодатель в этой сессии не открывались.
- P-тесты подфазы: меню на 360 открывается; полоса на 1280 и 1536 без наложений.
- Миграции: нет.
- Изменённые файлы: код шапки уже был в рабочей копии до этой проверки. Новых правок кода нет.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-08] — места в команде — DONE (не выложено)

- Сделано: владелец на профиле компании видит участников и добавляет человека по почте уже существующего аккаунта. «Старт» и «Найм» — 2 места, считая владельца. Живая «Команда» поднимает эту компанию до 10. Третий на бесплатном потолке не проходит. Импорт по-прежнему нельзя пополнить. Воронка и CSV не включены. Текст тарифов и пункт 10.5 говорят это. Более сильная модель и автоматический возврат по-прежнему не включены. Промпт версии 9.
- Команды проверки: `pnpm legal:sync` → 0; `tsc --noEmit` → 0; eslint по затронутым файлам → 0; vitest мест, сообщений и условий → 3 файла, 16 прошло. Интеграционный тест членства не гонялся: локальная база указывает на облако. Страница компании у текущего входа без компании показывает форму создания, блок участников скрыт.
- P-тесты подфазы: страница компании владельца показывает «1 из 2». Живая «Команда» на 10 в этой сессии не покупалась.
- Миграции: нет.
- Изменённые файлы: компании, оплата, вход, сообщения, условия, промпт, D367.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-08] — блок «Продвигается» на 7 дней — DONE (не выложено)

- Сделано: живая оплата «Найма» ставит свою опубликованную вакансию в блок на главной и в каталоге без фильтров, плюс значок на карточке и на странице вакансии. Окно — 7 дней с создания покупки. Импорт туда не попадает. Текст тарифов и пункт 10.5 говорят это. Места в команде, более сильная модель и автоматический возврат по-прежнему не включены. Промпт версии 8.
- Команды проверки: `tsc --noEmit` → 0; eslint по затронутым файлам → 0; vitest окна, условий и сообщений → 15 прошло; `pnpm legal:sync` → 0. Локально `/` и `/jobs` → 200, `/ru/terms` содержит «на 7 дней».
- P-тесты подфазы: живой оплаченный «Найм» в блоке не проверялся, такой покупки в этой сессии не было.
- Миграции: нет своих. На облако применены уже написанные `0040` и `0041`, иначе каталог падал: схема уже выбирала `companies.timezone`.
- Изменённые файлы: поиск вакансий, главная, каталог, страница вакансии, оплата, сообщения, условия, промпт, D366.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-08] — касса после Google и X, потолок Spoki — DONE

- Сделано: Google и X несут тот же список возврата, что и пароль, включая оплату Plus, Pro, «Найм» и «Команда». Чужой адрес отбрасывается. Бесплатный вошедший остаётся на 15 сообщениях Spoki в сутки, гость на 5. Живой Plus даёт 100, Pro — 300. Условия 10.5 и страница тарифов говорят это же и по-прежнему не обещают более сильную модель, блок «Продвигается», места в команде и автоматический возврат. Промпт версии 7. Пояс компании и флаг поиска кандидата не мигрировались.
- Команды проверки: `pnpm legal:sync` → 0; vitest входа, потолка, условий, сообщений и тарифов → 6 файлов, 58 прошло; `tsc --noEmit` → 0; eslint по затронутым файлам → 0.
- P-тесты подфазы: страница входа с `next=billing-plus` должна отдавать ссылку Google с этим ключом.
- Миграции: нет.
- Изменённые файлы: `login-next.ts`, callback, oauth-redirect, вход и регистрация, `rate-limit.ts`, `conversation.ts`, промпт, сообщения, условия, D363, D364, ТЗ сводок и бота.
- Отклонения от ТЗ: раздел 12.5 всё ещё писал 30 и 200; в коде с D323 уже 5 и 15, текст ТЗ приведён к коду.
- OPEN QUESTION: юрлицо по-прежнему пустое. Испанские условия ждут перевода уже выложенного текста.
- Следующая подфаза: только по команде.

## [2026-10-08] — тарифы и условия говорят правду об оплате — DONE (не выложено)

- Сделано: на тарифах больше не написано, что планы готовятся, что возврат уходит сам и что карты идут через Stripe. Условия, пункт 10.5, версия `2026-10-08`: USDT или USDC, 30 дней, без автопродления, возврат «Найма» вручную. Блок «Продвигается», лимиты агента и места в команде этим платежом не включаются.
- Команды проверки: `pnpm legal:sync`; vitest юридических текстов и сообщений → 14 прошло.
- P-тесты подфазы: страница тарифов в браузере после выкладки.
- Миграции: нет.
- Изменённые файлы: сообщения en/ru/es/pt-BR, `legal-terms.md`, `legal.json`, `legal.ts`, D363.
- Отклонения от ТЗ: нет. Включение лимитов карточек не делалось: этих систем ещё нет.
- OPEN QUESTION: юрлицо по-прежнему пустое.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-08] — кнопки Spoki в Telegram — DONE (не выложено)

- Сделано: вакансия, оплата, тарифы, регистрация, размещение и вход из чата Telegram уходят кнопкой на страницу сайта. Адрес собирает сервер. Нажатие не подтверждает отклик и не включает тариф.
- Команды проверки: vitest Telegram-агента и инструментов → 25 прошло. eslint по агенту и отправке → 0.
- P-тесты подфазы: живое сообщение в Telegram не отправлялось.
- Миграции: нет.
- Изменённые файлы: `telegram-bot.ts`, `telegram-agent.ts`, тест агента, ТЗ 12.3, D362.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-08] — развилка всех ходов Spoki — DONE (не выложено)

- Сделано: промпт версии 6, блок `ROUTES`. На ход один маршрут: сторона, поиск, гость, отклик, профиль, найм, цена, отказ. После помощи не больше одного вопроса или одной карточки.
- Команды проверки: vitest памяти бота → 6 прошло.
- P-тесты подфазы: живой диалог модели не гонялся.
- Миграции: нет.
- Изменённые файлы: `system.ts`, `memory.test.ts`, ТЗ 12.4, D361.
- Отклонения от ТЗ: сценарии работодателя в ТЗ были V2; карточки размещения и оплаты компании уже заданы D360 и оставлены. Просмотр кандидатов в чат не добавлялся.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-08] — Spoki подводит к оплате — DONE (не выложено)

- Сделано: промпт версии 5. Сначала помощь по вопросу, затем одна фраза и карточка подходящего тарифа. Ищущему Plus $5 или Pro $15, компании «Найм» $79 или «Команда» $199. «Старт» бесплатный. Годовую цену и ещё не включённые лимиты не обещает.
- Команды проверки: vitest памяти и инструментов бота → 21 прошло.
- P-тесты подфазы: живой ответ модели не гонялся. Локальный ключ модели в прошлой проверке не отвечал.
- Миграции: нет.
- Изменённые файлы: `system.ts`, `tools.ts`, `memory.test.ts`, ТЗ 12.4, D360.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-08] — карточка шага и голос Spoki — DONE (не выложено)

- Сделано: `offer_step` показывает карточку оплаты тарифа, тарифов, регистрации или размещения. Адрес собирает сервер. Гость на оплате уходит на вход. Промпт версии 4: короткие фразы, один шаг, без продажи, пока человек сам не спросит про охват или лимит.
- Команды проверки: `pnpm typecheck` → 0; eslint по боту и чату → 0; vitest инструментов, Telegram, памяти и сообщений → 40 прошло.
- P-тесты подфазы: живой ответ модели не гонялся.
- Миграции: нет.
- Изменённые файлы: `offers.ts`, `tools.ts`, `system.ts`, `chat.tsx`, `telegram-agent.ts`, сообщения en/ru/es/pt-BR, ТЗ 12.3, D359.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. На прод не выкладывалось.

## [2026-10-08] — гость с «Оплатить» на вход, знаки USDC и Tether — DONE

- Сделано: на тарифах кнопка оплаты у гостя ведёт сразу на `/login?next=billing|billing-team|billing-plus|billing-pro`. Вошедший открывает кассу. Если сессия пропала во время оплаты, касса тоже уходит на вход. Знаки в кассе — публичные знаки USDC (Circle) и Tether.
- Команды проверки: `pnpm typecheck` → 0; eslint по тарифам и кассе → 0; vitest тарифов, сообщений и ошибок оплаты → 14 прошло.
- P-тесты подфазы: живой перевод не проводился.
- Миграции: нет.
- Изменённые файлы: `pricing.ts`, страница тарифов, `login-next.ts`, `token-mark.tsx`, `crypto-pay.tsx`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-08] — проверка ошибок оплаты — DONE

- Сделано: отмена в кошельке больше не пишется как «перевод не засчитан». Пока перевод проверяется, вторая оплата не стартует. Plus, Pro и «Команда» не получают письмо «Найм включён» с пустой ссылкой на вакансию. Неверная сеть и USDT на Base называются отдельно.
- Команды проверки: `pnpm typecheck` → 0; eslint по кассе и подтверждению → 0; vitest кассы и сообщений → 10 прошло. Журнал production за сутки: ошибок `/api/billing` нет. Старый 500 входа уже закрыт. Таймаут `/matches` от 5–7 октября к оплате не относится.
- P-тесты подфазы: живой перевод не проводился.
- Миграции: нет.
- Изменённые файлы: `crypto-pay.tsx`, `pay-error.ts`, подтверждение заказа, сообщения.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-08] — окно оплаты со знаками USDC и Tether — DONE

- Сделано: касса на `/billing/crypto` показывает тариф, цену и 30 дней. USDC и Tether выбираются карточками со знаками. Кнопка пишет сумму и токен. Тексты кассы доходят до клиента: пространство `billing` добавлено в набор клиентских переводов.
- Команды проверки: `pnpm typecheck` → 0; eslint по кассе и знакам → 0; `vitest run src/messages/messages.test.ts` → 9 прошло.
- P-тесты подфазы: локально `/ru/dev/pay-preview` (страница удалена, в продукт не входит) — карточки USD Coin и Tether, кнопка меняется на «Оплатить $5 USDT». Живой перевод не проводился.
- Миграции: нет.
- Изменённые файлы: `src/modules/billing/ui/crypto-pay.tsx`, `src/components/ui/token-mark.tsx`, страница оплаты, сообщения, layout.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-08] — вход после кнопки тарифа — DONE

- Сделано: проверка `next` на странице входа живёт вне клиентского модуля. Иначе `/login?next=billing-plus` падал с 500: сервер вызывал функцию из `"use client"`.
- Команды проверки: `pnpm typecheck` → 0; eslint по файлам входа → 0.
- P-тесты подфазы: гость с кнопки «Команда» на https://intgetion.com/ru/pricing?for=companies попадает на `/ru/login?next=billing-team`, форма входа на месте. Выкладка `dpl_3CKKgE4guXtB1SFSj63YWBnAmYiX` стоит на intgetion.com.
- Миграции: нет.
- Изменённые файлы: `src/components/auth/login-next.ts`, `login-form.tsx`, `login/page.tsx`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-08] — кнопки «Команда», Plus и Pro (D358) — DONE

- Сделано: «Старт» бесплатный. «Команда» ($199), Plus ($5) и Pro ($15) открывают оплату и включают тариф на 30 дней после проверки перевода. Годовая цена не списывается, автопродления нет. Сумма берётся из `plans` и должна совпасть с карточкой.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 806 прошло, 1 пропущен. `pnpm db:migrate` → applied `0039_billing_plans.sql`. Первый прогон миграции упал на RLS (`plans` с FORCE); вставка идёт при снятом force и force возвращается.
- P-тесты подфазы: на https://intgetion.com/pricing?for=companies ссылки «Найм» и «Команда» ведут на `/billing/crypto?plan=hire` и `plan=team`. На `/pricing` Plus и Pro — на `plan=plus` и `plan=pro`. «Старт» остаётся бесплатным. Живой перевод с кошелька не проводился. Лимиты и инструменты этих карточек платежом не включаются.
- Миграции: `0039_billing_plans.sql` на облаке.
- Изменённые файлы: оплата, тарифы, вход с возвратом на план, сообщения, документы.
- Отклонения от ТЗ: подписка в PAYMENTS.md — это один платёж на 30 дней, не автосписание.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

> Older entries: [docs/archive/mission-log/](docs/archive/mission-log/) — see [docs/archive/INDEX.md](docs/archive/INDEX.md).
> Session protocol: [docs/tz/00-protocol.md](docs/tz/00-protocol.md). Status now: [docs/CURRENT.md](docs/CURRENT.md).

## [2026-10-08] — кнопка «Найм» на тарифах (D357) — DONE

- Сделано: на `/pricing` карточка «Найм» — ссылка на `/billing/crypto`. Там владелец выбирает опубликованную вакансию. «Команда», Plus и Pro остаются «Скоро».
- Команды проверки: `pnpm typecheck` → 0; eslint по страницам тарифов и оплаты → 0; `vitest run src/config/pricing.test.ts src/messages/messages.test.ts` → 12 прошло.
- P-тесты подфазы: на https://intgetion.com/pricing?for=companies кнопка «Pay with USDT or USDC» у гостя открывает `/login?next=billing`. На `/ru/pricing?for=companies` кнопка «Оплатить в USDT или USDC». Живой перевод с кошелька не проводился.
- Миграции: нет.
- Изменённые файлы: `src/app/[locale]/pricing/page.tsx`, `src/app/[locale]/billing/crypto/page.tsx`, `src/config/pricing.ts`, `src/modules/billing/service/billing-service.ts`, сообщения.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-08] — приём «Найма» на production (D356) — DONE

- Сделано: страница оплаты берёт кошелёк из браузера, без Project ID WalletConnect. На production включены `BILLING_ENABLED`, провайдер `walletconnect`, официальные контракты USDC (Circle) и USDT (Tether / USDT0) и публичные RPC. На Base контракта USDT в официальных страницах нет, там только USDC. Выкладка `dpl_8sGLZVb4mHFdim4F2GEb5zkakTyh` стоит на https://intgetion.com. Без входа `/billing/crypto` уходит на `/login`.
- Команды проверки: чтение контрактов в сети → `decimals` 6 и ожидаемый `symbol`; `pnpm typecheck` → 0; eslint по файлам оплаты → 0; `pnpm exec vitest run src/messages/messages.test.ts src/lib/billing` → 14 прошло.
- P-тесты подфазы: живой перевод с кошелька основателя в этой сессии не проводился.
- Миграции: нет новых. `0038` уже на облаке.
- Изменённые файлы: `src/modules/billing/ui/crypto-pay.tsx`, `src/app/[locale]/billing/crypto/page.tsx`, `src/messages/{en,ru,es,pt-BR}.json`, документы.
- Отклонения от ТЗ: кабинет WalletConnect не выдаёт Project ID без входа основателя. Санкционный список не подключён. RPC публичные.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

## [2026-10-08] — выкладка pt-BR, сводок и оплаты — DONE

- Сделано: на облако применены `0035`–`0038`. На https://intgetion.com стоит выкладка `dpl_7e9vxx63wQnwuyFaEHxP6XASnd9M`: португальский (Бразилия), сводки работодателя с админкой и вступлением, и путь оплаты «Найма». Приём денег не включался: нет контрактов токенов, проекта WalletConnect и RPC. `/pt-BR` отвечает 200, `/billing/crypto` без входа уходит на `/login`.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm test` → 804 прошло, 1 пропущен; `pnpm db:migrate` → applied 0035, 0036, 0037, 0038.
- P-тесты подфазы: нет отдельного прогона в браузере. Оплата на сайте остаётся заявкой, пока флаги выключены.
- Миграции: `0035_locale_pt_br.sql`, `0036_company_agent_briefs.sql`, `0037_brief_runs_employers.sql`, `0038_billing_hire.sql` — на облаке.
- Изменённые файлы: язык pt-BR, сводки, оплата, документы статуса. Не в коммите: `.claude/` и `docs/tz/20-morning-briefs.local-draft.md`.
- Отклонения от ТЗ: номера D352, D354 и D355 в DECISIONS заняты и сводками, и оплатой. Санкционный список и блок «Продвигается» в ленте по-прежнему не сделаны.
- OPEN QUESTION: контракты USDT/USDC, проект WalletConnect и RPC основатель кладёт в окружение, не в чат. Адреса Tron и Solana не заданы.
- Следующая подфаза: только по команде. Боевое включение оплаты — после этих трёх значений.

## [2026-10-08] — оплата «Найма», статус и тариф (D354) — DONE

- Сделано: миграция `0038_billing_hire.sql`, проверка перевода, заказ WalletConnect, статус только с сервера, «Найм» на 30 дней одной транзакцией после `paid`. Без флагов страница пишет заявку и тариф не включает. Кабинет `/employer/billing` и страница вакансии показывают «Старт» или «Найм».
- Команды проверки: `pnpm exec tsc --noEmit` → 0; eslint по файлам оплаты → 0; `pnpm test` → 796 прошло, 3 упали в `auth-emails.test.ts` без `NEXT_PUBLIC_SITE_URL` (так же падает без этой переменной и до оплаты); с `NEXT_PUBLIC_SITE_URL=http://localhost:3000` эти 11 писем проходят.
- P-тесты подфазы: девять отказов проверки перевода по отдельности, недоплата и повтор не включают тариф.
- Миграции: `0038_billing_hire.sql` (на облако не выкладывалась).
- Изменённые файлы: `src/db/migrations/0038_billing_hire.sql`, `src/lib/billing/**`, `src/modules/billing/**`, `src/app/api/billing/**`, `src/app/api/cron/billing/route.ts`, `src/app/[locale]/billing/crypto/page.tsx`, `src/app/[locale]/employer/billing/page.tsx`, `src/messages/*.json`, `vercel.json`, `.env.example`, `scripts/env-rules.mjs`.
- Отклонения от ТЗ: санкционный список не подключён (проверка умеет `frozen`, сверка с OFAC — до боевого включения). Общая лента ещё не рисует блок «Продвигается» из покупки. Письмо уходит только если заданы Resend и почта владельца.
- OPEN QUESTION: адреса контрактов USDT/USDC и адрес Safe основатель кладёт в окружение, не в репозиторий.
- Следующая подфаза: боевое включение (D в ТЗ) только по команде, после миграции `0038` на облако.

## [2026-10-08] — статус оплаты и появление тарифа (D353) — DONE

- Сделано: в ТЗ оплаты статус заказа выдаёт и проверяет только сервер. Клиент его опрашивает. «Найм» (`company_hire`) появляется в кабинете и на вакансии только в статусе `paid`, одной транзакцией. До этого остаётся «Старт». Поправлены противоречия: код `company_growth` в PRICING §6.1 и общий вебхук в §6.3. Код не писался.
- Команды проверки: нет — правка документов.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/23-billing.md`, `docs/PAYMENTS.md`, `docs/PRICING.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет новых. Адреса не-EVM по-прежнему не заданы.
- Следующая подфаза: только по команде.

## [2026-10-08] — USDT и USDC на любой сети (D352) — DONE

- Сделано: в ТЗ оплаты покупатель сам выбирает USDT или USDC и сеть. Оба токена на EVM-сетях белого списка, один адрес компании. Сеть не из EVM в решение входит, но не покрывается адресом `0x`. Код не писался.
- Команды проверки: нет — правка документов.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/23-billing.md`, `docs/PAYMENTS.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: адреса получателя для Tron и Solana не заданы.
- Следующая подфаза: только по команде.

## [2026-10-08] — ТЗ оплаты WalletConnect (D351) — DONE

- Сделано: живое ТЗ `docs/tz/23-billing.md`. Первая оплата — WalletConnect, услуга «Найм» $79, один EVM-адрес компании, без ключа на сервере. Карты, Tron и тарифы кандидата вынесены из первых подфаз. Механика проверки остаётся в `docs/PAYMENTS.md`, цены — в `docs/PRICING.md`. Код не писался.
- Команды проверки: нет — документов достаточно, кода нет.
- P-тесты подфазы: нет.
- Миграции: нет.
- Изменённые файлы: `docs/tz/23-billing.md`, `docs/tz/INDEX.md`, `docs/PAYMENTS.md`, `docs/DECISIONS.md`, `docs/OPEN_TASKS.md`, `docs/CURRENT.md`.
- Отклонения от ТЗ: нет. V3-запрет на код оплаты сохранён до явной подфазы.
- OPEN QUESTION: первая сеть (консервативно Base); адрес Safe основатель кладёт в окружение, не в чат; юрлицо по-прежнему открыто до боевых денег.
- Следующая подфаза: только по команде. Подфаза B ТЗ — заглушка заявки, без перевода.

## [2026-10-08] — язык pt-BR (D350) — DONE

- Сделано: `src/messages/pt-BR.json` (перевод всех ключей en), `routing.ts` (`pt-BR`), `intlLocale` → `pt-BR`, каталог серверных писем, имена языка в en/ru/es. Письма: `email-html.ts`, `renderAuthEmail` берёт pt-BR из каталога; Go-шаблоны `supabase/templates/*` и темы в `config.toml` ветвятся ru/es/pt-BR/en. Бот: `linesFor` — `pt*` → pt-BR, строки входа через Telegram на pt-BR. Юридические тексты: секции `<!-- pt-BR -->` в `legal-terms.md` и `legal-privacy.md`, `pnpm legal:sync`, `legalText` отдаёт pt-BR. Миграция `0035_locale_pt_br.sql` и CHECK в `src/db/schema`. `SEO_LOCALES`, заголовок RSS, письмо проверки домена, язык в промпте агента.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 781 прошло, 2 упало в `auth-emails.test.ts` (нет `NEXT_PUBLIC_SITE_URL` в окружении, на чистом master падает так же); с `NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm test` → 783 прошло, 1 пропущен. `pnpm build` без переменной → 1 (`ERR_SWC_NATIVE_CACHE`, ACL Windows); `SWC_NATIVE_BINDING_CACHE=C:UsersAdmin.swc-cache-cursor pnpm build` → 0. В браузере `/pt-BR/jobs` и `/pt-BR/terms` на португальском, тексты вакансий на исходном языке.
- P-тесты подфазы: новые тесты — каталог pt-BR (ключи и плейсхолдеры), бот pt/pt-br и запасной английский для es, `legalText` pt-BR, письмо magic link pt-BR, шаблоны Supabase на четыре языка, hreflang и IndexNow.
- Миграции: `0035_locale_pt_br.sql` (на облако не выкладывалась).
- Изменённые файлы: `src/messages/*.json`, `src/i18n/{routing,locale,messages}.ts`, `src/lib/{email-html,auth-email-templates}.ts`, `supabase/templates/*`, `supabase/config.toml`, `src/modules/bot/service/telegram-agent.ts`, `src/modules/bot/prompts/system.ts`, `src/modules/auth/service/telegram-login.ts`, `src/modules/companies/service/verification-service.ts`, `src/modules/jobs/service/job-feed.ts`, `src/modules/seo/site.ts`, `src/db/schema/*`, `scripts/legal-sync.mjs`, `src/content/legal/*`, `docs/content/legal-*.md`, тесты.
- Отклонения от ТЗ: нет. Mini App (`tg.html`, перенаправление в `proxy.ts`) не трогал — D350.
- OPEN QUESTION: перевод юридических текстов на pt-BR — машинный уровень, нужна проверка юристом до опоры на него.
- Следующая подфаза: только по команде (de/fr/it не начинались). Миграцию `0035` выложить на облако по протоколу до выкладки кода, иначе пользователь с pt-BR упрётся в CHECK.

## [2026-10-08] — вход через X включён — DONE

- Сделано: в существующем приложении портала X включена аутентификация пользователя (OAuth 2.0, confidential, запрос почты, права Read). Callback — облачный Supabase. Провайдер X / Twitter (OAuth 2.0) включён в проекте `intgetion-dev`. Секрет в репозиторий и в лог не писался. `GET /api/auth/x` отвечает 307 на authorize, следующий шаг — `x.com/i/oauth2/authorize`.
- Команды проверки: `curl` authorize → 302 на `x.com`. lint/typecheck/test не запускались — код не менялся.
- Миграции: нет.
- Изменённые файлы: `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет. Имя приложения в портале переименовано в `INTGETION JOB LIST`.
- Следующая подфаза: только по команде.

## [2026-10-08] — канал Jobs Alert включён на проде — DONE

- Сделано: `JOBS_ALERT_CHAT_ID` записан в Vercel production проекта `intgetion-job-list` (тип sensitive, preview не задан). Бот уже админ канала. Перевыкладка текущего production `dpl_9RYxwju33cs6pPMHu32sy4b1TDNh` → `dpl_DrtiLuTMVg4qfvdvrzdZqmZwdX44`, чтобы cron увидел переменную. Само значение id в лог не пишется.
- Команды проверки: создание env через Vercel API — created, failed пустой. Выкладка `dpl_DrtiLuTMVg4qfvdvrzdZqmZwdX44` — READY, алиас intgetion.com.
- Миграции: нет ( `0033` уже на облаке).
- Изменённые файлы: `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: вход через X. Портал разработчика в браузере агента всё ещё на экране входа.

## [2026-10-08] — хвосты канала, X и писем входа — BLOCKED

- Сделано: сверка прода, без новых фич. Письма входа уже брендированные: Send Email Hook на `https://intgetion.com/api/auth/hooks/send-email` включён, `AUTH_SEND_EMAIL_HOOK_SECRET` есть в Vercel (production и preview). В логах Auth за 2026-10-07 есть `Hook ran successfully`. Вставка HTML в Dashboard не нужна, пока хук включён. Google в `/auth/v1/settings` включён, X/twitter выключен. `JOBS_ALERT_CHAT_ID` в Vercel проекта `intgetion-job-list` отсутствует.
- Команды проверки: чтение `/auth/v1/settings` и списка env Vercel (без расшифровки секретов); выборка `auth_logs` за сутки. lint/typecheck/test не запускались — код не менялся.
- Миграции: нет.
- Изменённые файлы: `docs/CURRENT.md`, `MISSION_LOG.md`.
- Отклонения от ТЗ: нет.
- OPEN QUESTION: нет.
- Следующая подфаза: канал — после числового chat id и прав бота писать в канал. X — после клиента OAuth 2.0 в портале разработчика (секрет в чат не присылать, только в Supabase). Язык `pt-BR` — отдельная сессия.

## [2026-10-07] — главная, адреса без /en и испанский — DONE

- Сделано: главная стала лентой вакансий, футер из трёх групп, меню зависит от типа аккаунта (D342–D344). Английский на корне, `/en` уходит на тот же путь без префикса (D345). Испанский — третий язык интерфейса (D346), миграция `0034_locale_es.sql`. Старый ежечасный digest не возвращался: утренние сводки читают каталог `es`.
- Команды проверки: typecheck и точечные vitest после сборки конфликтов.
- Миграции: `0034_locale_es.sql`. Тестовая капля Remotive не вливалась.
- Отклонения: номера D332–D336 на ветке Клода уже были заняты, здесь это D342–D346.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. Дальше по языкам — португальский.

## [2026-10-07] — утренние сводки и канал Jobs Alert на прод — DONE

- Сделано: в одну ветку собраны утренние сводки Claude (D340, слоты Чикаго / Берлин / Москва, cron `/api/cron/morning-briefs`) и канал Jobs Alert (D341). Старые ветки `origin/claude/*` не мержились: те же решения уже на master. На облако применены `0032_morning_briefs.sql` и `0033_jobs_alert.sql`. Канал молчит, пока в Vercel пустой `JOBS_ALERT_CHAT_ID`.
- Команды проверки: `vitest` jobs-alert, briefs, digest-service → 23 passed. `tsc` на чистом дереве без локального `.next` (локальный прогон упёрся в устаревший тип удалённого `/api/cron/digest` в `.next`, каталог в gitignore).
- Миграции: `0032_morning_briefs.sql`, `0033_jobs_alert.sql` — applied на облаке.
- Изменённые файлы: сводки в `src/modules/notifications/`, канал в `src/modules/jobs/service/jobs-alert.ts`, `vercel.json`.
- Отклонения от ТЗ: номер канала сдвинут на 0033 и D341, потому что 0032 и D340 заняты сводками. `app_rw` читает одну строку `schema_migrations`.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде. Чтобы канал писал, бот должен быть админом канала и в Vercel нужен числовой `JOBS_ALERT_CHAT_ID`.

## [2026-10-07] — канал Jobs Alert — DONE

- Сделано: новая опубликованная вакансия уходит в канал Jobs Alert фиксированным текстом (название, компания, зарплата, ссылка) из cron `/api/cron/telegram` после личной рассылки. Без LLM. Метка `jobs_alert_sent_at` только после успешной отправки. Старые вакансии не догоняются. На intgetion.com источник Remotive не постится. Пустой chat id выключает только этот шаг. Зарплата — в валюте работодателя, иначе USD.
- Команды проверки: `vitest` jobs-alert → 12 passed (вместе со сводками — 23).
- Миграции: `src/db/migrations/0033_jobs_alert.sql`.
- Изменённые файлы: `src/modules/jobs/service/jobs-alert.ts`, cron telegram, схема jobs, тесты, `scripts/env-rules.mjs`.
- Отклонения от ТЗ: `app_rw` получает чтение одной строки `schema_migrations` (имя этой миграции), иначе водяной знак из cron не виден.
- OPEN QUESTION: нет.
- Следующая подфаза: только по команде.

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

## [2026-10-07] — утренние сводки, подфаза A (D340) — ветка feat/morning-briefs

- Сделано: ТЗ `docs/tz/20-morning-briefs.md`. Миграция `0032_morning_briefs.sql`: таблицы слотов, паузы, запусков и доставок плюс флаг агента у кандидата. Чистая логика слотов `notifications/lib/briefs.ts`. Cron `/api/cron/morning-briefs` (`*/15`) вместо `/api/cron/digest`. Отправка идёт через `deliverInTransaction`, Telegram доставляет D237. Есть `runSlot` с сухим прогоном для будущей админки.
- Команды проверки: `pnpm typecheck` → 0, `pnpm lint` → 0. `pnpm test`: 747 прошло, 3 упало — `legal.test.ts` и `auth-emails.test.ts`; на чистом master они падают так же, к задаче не относятся. Новый `briefs.test.ts` зелёный. `pnpm build` локально не собирается: Windows не даёт SWC писать в кэш (`ERR_SWC_NATIVE_CACHE`), это окружение, а не код — проверит CI. Интеграционный `morning-briefs.integration.test.ts` проверит CI.
- Миграции: `0032_morning_briefs.sql`. Решения: D340.
- OPEN QUESTION: нет. Следующее — подфаза B по команде.

## [2026-10-07] — кнопки в шапке: вакансия и агент (D347, D348)

- Сделано: «Разместить вакансию» в шапке и в профиле. Вошедший без тарифа сначала видит тарифы компаний; бесплатный «Старт» ведёт на форму. «Общаться с агентом» с иконкой снова в шапке и ведёт на `/chat`. Там строка про Telegram и ссылка `https://t.me/intgetion_bot`.
- Команды проверки: `pnpm exec tsc --noEmit` и `pnpm exec vitest run src/lib/viewer.test.ts src/config/pricing.test.ts src/messages/messages.test.ts` → 0. В браузере: шапка, тарифы компаний, бесплатный путь, текст и ссылка на бота.
- Миграции: нет. Решения: D347, D348.
- OPEN QUESTION: нет. Выбор бесплатного тарифа не сохраняется — оплаты ещё нет, поэтому тарифы показываются каждый раз.

## [2026-10-07] — утренние сводки, подфаза B (D349) — DONE

- Сделано: на `/notifications` галочка «Новые вакансии на почту» пишет канал `email` для тех же типов, что и Telegram. Заглушка или неподтверждённая почта — галочка выключена, ссылка «добавить почту». Переключатель «Агент подбирает мне вакансии» пишет `agent_briefs_enabled` только своему профилю; выключен — обе галочки серые. Текст Telegram для `matches.digest`: до пяти строк «Название — Компания» со ссылкой на вакансию, внизу `/matches` и `/notifications`. Кнопки шапки чуть компактнее.
- Команды проверки: на ветке `cursor/briefs-b` до слияния — `pnpm lint` → 0; `pnpm typecheck` → 0; `pnpm test` → 750 прошло, 3 упало в `legal.test.ts` и `auth-emails.test.ts` (те же, что до задачи). `pnpm build` локально не запускался: `ERR_SWC_NATIVE_CACHE`, ACL не трогал.
- P-тесты подфазы: нет отдельных P-номеров.
- Миграции: нет.
- Изменённые файлы: галочки и страница `/notifications`, сервис флага агента, payload сводки, `telegramText`, каталоги en/ru/es, тесты, шапка.
- Отклонения от ТЗ: номер сдвинут с D341 на D349, потому что D341 на master — канал Jobs Alert.
- OPEN QUESTION: нет.
- Следующая подфаза: C, только по команде.

## [2026-10-08] — утренние сводки, подфаза C (D352) — сторона работодателя

- Сделано: флаг `companies.agent_briefs_enabled` (миграция `0036`, на облако не применялась, деплоя нет). Тип `company.candidates_digest` в каталоге и в наборе галочек. Подбор кандидатов через `computeMatchesForJob` + `matching_results`, ≥ 0.65, без `is_hidden` и откликнувшихся, новые с прошлой сводки, ≤ 5. Обезличенная карточка, строгая схема payload. Вторая петля в `runSlot` с общими счётчиками; транзакция `brief_deliveries` (employer) → `deliverInTransaction` → заметка в `/chat` шаблоном. Telegram-строки со ссылкой на `/employer/jobs/{id}`, кнопка в письме. На `/employer/jobs/{id}` — короткий обезличенный список подходящих. На `/notifications` — переключатель компании (owner/admin) и подписи работодателю. Строки en/ru/es/pt-BR.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0. `pnpm test`: 788 прошло, 3 упало в `auth-emails.test.ts` (D350, незакоммиченный файл; падает, если `NEXT_PUBLIC_SITE_URL` не задан в окружении — порядок тестов). С `NEXT_PUBLIC_SITE_URL=http://localhost:3000` — 791 прошло, 1 пропущен. `pnpm build` локально не собирается: `ERR_SWC_NATIVE_CACHE` (ACL на `AppData\Local`), ACL не трогал — проверит CI. Интеграционный `employer-briefs.integration.test.ts` (скрытый, флаг выкл., 5 карточек без контактов, повтор за день) — проверит CI.
- Миграции: `0036_company_agent_briefs.sql` (не на облаке). `0035` не трогал.
- Решения: D352 (D351 уже занят оплатой).
- OPEN QUESTION: у работодателя и компании нет колонки часового пояса — все работодатели в слоте `europe` (D340 «нет пояса → europe»). Нужна ли колонка пояса? «Флаг поиска» кандидата в базе не существует — фильтруем только `is_hidden`. Нужен ли отдельный флаг «ищу работу»?
- Не коммитил.

## [2026-10-08] — утренние сводки, подфаза D (D354) — админка `/admin/briefs`

- Сделано: раздел `/admin/briefs` — три слота (IANA-пояс, время с шагом 15 мин, вкл/пауза, следующий запуск UTC и местный), глобальная пауза, «сухой прогон» и «боевой запуск» с подтверждением, журнал за 30 дней (кандидаты и работодатели отдельно), счётчики подписок по слотам. API `/api/admin/briefs/*`, права owner/admin (`jobs_scheduler.manage`/`.run`), каждое действие в `audit_log`. Миграция `0037_brief_runs_employers.sql` (`checked_employers`). Строки en/ru/es/pt-BR.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0. `pnpm test`: 791 прошло, 3 упало в `auth-emails.test.ts` (D350, нет `NEXT_PUBLIC_SITE_URL` в окружении; то же, что в подфазе C). С `NEXT_PUBLIC_SITE_URL=http://localhost:3000` — 794 прошло, 1 пропущен. `pnpm build` локально: `ERR_SWC_NATIVE_CACHE` (ACL `AppData\Local`), не трогал — проверит CI. Интеграционный `briefs-admin.integration.test.ts` (сухой прогон не пишет `brief_deliveries`/уведомления; повторный боевой → 409) — проверит CI.
- Миграции: `0037_brief_runs_employers.sql` (не на облаке). 0032–0036 не менялись.
- Решения: D354.
- OPEN QUESTION: боевой запуск требует свежий step-up (как прочие опасные действия админки); если мешает — снять флаг `dangerous`. Путь `/es/admin/...` и `/pt-BR/admin/...` реестр разделов не распознаёт (регулярка только en|ru, было до задачи) — страница сама проверяет право.
- Не коммитил, не деплоил.

## [2026-10-08] — утренние сводки, подфаза E (D355) — вступление от LLM

- Сделано: `writeBriefIntro` (OpenRouter через `llmFromEnv`, модель extract, ≤ 200 токенов, таймаут 8 с, карточки как недоверенные данные) с фолбэком на шаблон `notifications.briefIntro` (en/ru/es/pt-BR). Поле `intro` в payload `matches.digest` и `company.candidates_digest`; Telegram, почта и заметка в `/chat` начинаются с него. LLM не выбирает и не переставляет карточки.
- Команды проверки: `pnpm lint` → 0; `pnpm typecheck` → 0. `pnpm test`: 801 прошло, 3 упало в `auth-emails.test.ts` (D350, нет `NEXT_PUBLIC_SITE_URL`; как в C и D). С `NEXT_PUBLIC_SITE_URL=http://localhost:3000` — 804 прошло, 1 пропущен. `pnpm build` локально: `ERR_SWC_NATIVE_CACHE` (ACL), не трогал — проверит CI. Интеграционный `brief-intro.integration.test.ts` (ошибка LLM → шаблон, уведомление создано) — проверит CI.
- Миграции: нет. Решения: D355.
- OPEN QUESTION: в DECISIONS номера D352 и D354 встречаются дважды — параллельная работа по оплате заняла их одновременно с подфазами C и D. Нужно перенумеровать одну из сторон (предлагаю сводки: C → D356, D → D357). Интеграционные тесты C и D без шва `writeIntro` в CI с ключом OpenRouter пойдут в сеть; на результат не влияет (фолбэк), но может замедлить.
- Не коммитил, не деплоил.

## 2026-10-08 — утренние сводки: пояс работодателя, флаг поиска, испанские условия

- Пояс работодателя: колонки нет ни в `users`, ни в `companies`. Новую не добавлял. Слот `europe` теперь не молча: cron пишет `no_employer_time_zone`; дыра и миграция описаны в `docs/tz/20-morning-briefs.md` §10.3.
- Флаг «в поиске»: колонки нет. Фильтр не менял, минимальная миграция в §10.4. Остановлено до команды.
- Испанские /terms и /privacy: не начаты. Пункт 10.5 (версия 2026-10-08) есть только в незакоммиченной рабочей копии, в master его нет.
- OPEN QUESTION: добавлять ли `companies.timezone` и `candidate_profiles.job_search_status`.
- Проверки: typecheck, eslint файла, vitest notifications (78) — зелёные.

## 2026-10-08 — испанские /terms и /privacy

- Перевёл опубликованную редакцию 2026-10-08 (коммит c4cdee5), включая 10.5, в блоки `<!-- es -->` обоих файлов `docs/content/legal-*.md`. Плейсхолдеры, юрлицо и TERMS_VERSION не трогал; ссылки ведут на /es/.
- `legal-sync.mjs` режет и `es`, `legalText` отдаёт `es`. Тест проверяет свой текст, отличие от en, совпадение плейсхолдеров и отсутствие `/en/`.
- Prettier выровнял таблицы pt-BR в privacy и перевёл файлы на LF; в legal.json `\r\n` стали `\n`, смысл не менялся.
- Проверки: legal:sync, vitest legal (5), typecheck, lint зелёные. `pnpm test`: 3 падения в auth-emails — нет `NEXT_PUBLIC_SITE_URL` локально, падают и без этих правок.

## 2026-10-08 — пояс компании и флаг поиска (D365)

- Миграции `0040_company_timezone.sql`, `0041_candidate_job_search_status.sql`; схема Drizzle обновлена. На облако не применены, не запушено.
- Поле пояса в профиле компании (`isIanaTimeZone`), переключатель поиска в профиле кандидата, подписи en/ru/es/pt-BR.
- Сводка: слот по поясу компании (`employerBriefTimeZone`), лог `no_employer_time_zone` только при смешанных/пустых поясах; кандидаты `not_looking` не попадают.
- Проверки: typecheck, lint, vitest notifications/candidates/companies (119 + новые) зелёные. Интеграционные тесты с миграциями — в CI.

## [2026-10-08] — номера сводок D368–D370 — DONE (только документы)

- Сделано: у оплаты и утренних сводок совпали заголовки D352, D354 и D355. Старые заголовки не переписывались. Дальше сторону работодателя цитировать как D368, админку сводок как D369, вступление как D370. Обновлены DECISIONS, ТЗ сводок, how-it-works, OPEN_TASKS, шапка PAYMENTS и строка индекса оплаты. Комментарии в коде в этой записи не менялись.
- Команды проверки: нет, код не менялся.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `docs/DECISIONS.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `docs/PAYMENTS.md`, `docs/tz/20-morning-briefs.md`, `docs/tz/23-billing.md`, `docs/tz/INDEX.md`, `docs/how-it-works/morning-briefs.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: выкладка пачки D365–D367 только по отдельной команде

## [2026-10-08] — номера сводок в комментариях кода — DONE

- Сделано: комментарии и названия тестов утренних сводок переведены на D368 (работодатель), D369 (админка), D370 (вступление). В `src` из старых номеров остался только D352 в `src/lib/billing/chains.ts` (выбор сети). Логика, тексты интерфейса и SQL не менялись; в миграциях `0036` и `0037` поправлена только первая строка-комментарий.
- Команды проверки: `pnpm exec vitest run` на `catalog.test.ts`, `briefs-admin.test.ts`, `brief-intro.test.ts` → 3 файла, 18 тестов, код 0.
- P-тесты подфазы: нет
- Миграции: нет (файлы `0036` и `0037` не переписывались, кроме комментария)
- Изменённые файлы: комментарии в `src/modules/notifications/**`, `src/modules/companies/**`, `src/components/notifications/**`, `src/components/admin/briefs-controls.tsx`, `src/db/schema/briefs.ts`, `src/db/schema/companies.ts`, `src/app/**` страницы и API сводок
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: выкладка пачки D365–D367 только по отдельной команде

## [2026-10-08] — шапка под ширину экрана (D371) — DONE

- Сделано: текстовые пункты шапки выходят с 1280 px, у работодателя с пятью пунктами — с 1440 px. До этого они в меню. «Общаться с агентом» в полосе — значок, полная подпись с 1536 px, если пунктов мало. «Разместить вакансию» — значок с 640 px и полная кнопка на широком экране. Иконки откликов, профиля и админки спрятаны обёрткой, иначе `inline-flex` оставлял их на телефоне и меню уезжало за край. Языки в подвале на узком экране — EN/RU/ES/PT и переносятся.
- Команды проверки: eslint на header, mobile-nav, locale-switch, logo → 0. В браузере `/ru`: 390, 768, 1280 и 1600 — кнопки шапки не пересекаются и не вылезают за край. Меню на 390 открывается столбиком.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/components/shell/header.tsx`, `src/components/shell/mobile-nav.tsx`, `src/components/shell/locale-switch.tsx`, `src/components/ui/logo.tsx`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: полоса с 1280/1440, не с 1024 (D371)
- OPEN QUESTION: нет
- Следующая подфаза: выкладка пачки только по отдельной команде

## [2026-10-09] — sanctions (D380) — DONE

- Сделано (две сессии): миграция `0046_sanctions.sql` (таблица `sanctioned_addresses`), `src/lib/billing/sanctions.ts` (разбор OFAC SDN, только крипто-адреса), сверка отправителя в `confirmHireOrder` → `frozen` без покупки, письмо владельцам платформы через `notifyPlatformOwners`, `refreshSanctionsList` (пустая выгрузка не стирает список), cron `/api/cron/sanctions` раз в сутки с `CRON_SECRET`, `vercel.json`. Эта сессия: тесты `src/lib/billing/sanctions.test.ts` и `src/modules/billing/__tests__/sanctions-flow.test.ts`, D380.
- Проверка теста на регрессию: при временно возвращённом `sanctioned: false` два теста заморозки падают; код восстановлен.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` (с `NEXT_PUBLIC_SITE_URL=http://localhost:3000`) → 0, 840 тестов, 1 пропущен.
- P-тесты подфазы: адрес из списка → `frozen`, покупка `pending`, `payments` пусто, письмо владельцу одно ✅; чистый адрес → `paid` ✅; пустая выгрузка список не трогает ✅; разбор берёт адрес, не имя ✅
- Миграции: `src/db/migrations/0046_sanctions.sql` (на облако не применена)
- Изменённые файлы: `billing-service.ts`, `billing/service/index.ts`, `admin-console/service/{console-service,index}.ts`, `vercel.json`, новые `sanctions.ts`, тесты, cron, миграция, docs.
- Отклонения от ТЗ: нет
- OPEN QUESTION: URL выгрузки OFAC сверить на живом сайте перед включением cron на проде; решение по замороженным суммам — основатель с юристом.
- Следующая подфаза: по команде основателя. Не закоммичено.

## [2026-10-11] — ссылки только http/https (D378) на сайте — DONE

- Сделано: правка из рабочей копии проверена и выложена без переписывания. Адрес отклика и адреса компании принимаются схемами только с `http`/`https`. Страница вакансии, DTO, `apply-external` и кнопка отклика отдают ссылку только через `publicHttpUrl`; сохранённый адрес другой схемы не показывается и не открывается. Импорт с таким адресом помечается `scam` и не публикуется.
- Команды проверки (`NEXT_PUBLIC_SITE_URL=http://localhost:3000`): `pnpm typecheck` → 0, `pnpm lint` → 0, `pnpm test` → 1: упал только `decide.test.ts` по таймауту 5000 мс (файл не менялся, тест не ослаблен); 833 прошли.
- P-тесты подфазы: `job-url.test.ts`, новые случаи в `eligibility.test.ts` и `ingestion.test.ts`
- Миграции: нет
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Выкладка: коммит `9886d5a`, Vercel production `intgetion-job-list-3q6e4a4h0` — success (по статусу GitHub; Vercel API ответил 403). Главная 200, вакансия `b71d30f4-…` 200.
- Следующая подфаза: санкции у Клода, не начинать без команды

## [2026-10-11] — миграция 0047 (чат вакансии) — DONE

- Сделано: на облаке применена только `0047_bot_job_focus.sql` (nullable `bot_conversations.job_id` и уникальный индекс `(user_id, job_id)`). Перед запуском сверка папки `src/db/migrations` с `public.schema_migrations`: из 41 файла не применена была только `0047`. В таблице есть старое имя `0020_telegram_login.sql`, файла с таким именем в папке нет; это не ожидающая миграция.
- Команды проверки: `pnpm db:migrate` → 0, в логе `applied: 0047_bot_job_focus.sql`. Уже запущенный `http://localhost:3000`: `GET /api/bot/conversation?job=b71d30f4-1ed7-43da-aed6-6653ae17b2c7&locale=en` → 200, в JSON есть `conversationId` и непустой `messages`.
- P-тесты подфазы: нет
- Миграции: `0047_bot_job_focus.sql`
- Изменённые файлы: `docs/CURRENT.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: санкции у Клода, не начинать без команды

## [2026-10-11] — санкционный список (D380) на сайте — DONE

- Сделано: в папке `sanctions` прогнаны проверки и сделан коммит `f2d5ddd` на `claude/sanctions` (код, тесты, cron, `0046_sanctions.sql`, D380 не переписывались). Ветка влита в master поверх `9886d5a` коммитом `c03e1d8`; конфликты в `MISSION_LOG.md`, `docs/CURRENT.md`, `docs/DECISIONS.md` разрешены с сохранением и D378, и D380. Чужая правка D382 на время вливания убрана в stash и возвращена без коммита.
- Команды проверки (папка `sanctions`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`): `pnpm typecheck` → 0, `pnpm lint` → 0, `pnpm test` → 0 (840 прошли, 1 пропущен).
- Миграции: сверка `schema_migrations` с файлами папки `sanctions` — ждал только `0046_sanctions.sql` (`0047` уже в базе). `pnpm db:migrate` из папки `sanctions` → 0, `applied: 0046_sanctions.sql`.
- Выкладка: `git push origin master` (`9886d5a..c03e1d8`); Vercel production `intgetion-job-list-pgqvaz4mf` — success (по статусу GitHub; Vercel API отвечает 403). Главная 200, вакансия `b71d30f4-…` 200, `/api/cron/sanctions` без секрета 404 (как задумано).
- Отклонения от ТЗ: нет
- OPEN QUESTION: URL выгрузки OFAC проверить по первому ночному запуску cron; решение по замороженным суммам — основатель с юристом.
- Следующая подфаза: только по команде основателя; пять шагов §15 не начинать.

## [2026-10-11] — приём Tron и Solana (D384), ветка claude/non-evm — DONE (без выкладки)

- Сделано: своя проверка квитанции для Tron (USDT TRC-20) и Solana (USDC, USDT): `src/lib/billing/non-evm/` (сети и контракты со ссылкой и датой проверки, base58, подпись кошелька, чтение квитанции, чистые проверки). Получатель — `COMPANY_WALLET_TRON` / `COMPANY_WALLET_SOLANA`, адрес `0x` отвергается. Отправитель доказан подписью (TronLink `signMessageV2`, Solana ed25519). Сервис оплаты ведёт заказ тем же путём статусов и той же транзакцией засчитывания; санкции D380 дают `frozen`. Касса показывает блок Tron/Solana только для сетей с заданным получателем; покупатель вставляет идентификатор транзакции. `verify-transfer.ts` (EVM) не менялся.
- Контракты: Tether supported-protocols и Circle USDC contract addresses, сверка Tronscan API и Solana `getAccountInfo` 2026-10-11. USDC на Tron у Circle нет — не предлагается.
- Команды проверки (`NEXT_PUBLIC_SITE_URL=http://localhost:3000`): `pnpm typecheck` → 0, `pnpm lint` → 0, `pnpm test` → 0 (869 прошли, 1 пропущен).
- P-тесты подфазы: `src/lib/billing/non-evm/non-evm.test.ts` (23 теста на фикстурах: верный перевод, чужой получатель, чужой отправитель, чужой контракт, недоплата, откат, санкции, подпись, `0x` в переменной).
- Миграции: нет
- Отклонения от ТЗ: нет
- OPEN QUESTION: живой перевод в Tron и Solana не проверялся (нет переменных и денег); TronLink и Phantom на телефоне не проверялись.
- Следующая подфаза: только по команде основателя (вливание, переменные Vercel, выкладка — не эта сессия).

## [2026-10-11] — выкладка приёма Tron и Solana (D384) — DONE (живой перевод не делался)

- Сделано: `COMPANY_WALLET_TRON` и `COMPANY_WALLET_SOLANA` заданы на Vercel production проекта `intgetion-job-list` (команда marks-projects) до сборки. Preview и development не трогались. `COMPANY_WALLET_ADDRESS` и `IMPORT_LIVE_ENABLED` не менялись. `claude/non-evm` (`d1a2875`) влит в master fast-forward, затем статус в `docs/CURRENT.md` (`fa64b6a`), чтобы не откатить уже включённый живой импорт. `git push` уже на `origin/master`. Выкладка `intgetion-job-list-5jpdyrb8r` (`dpl_E9ZKZh1fXxb6metebQr1ZhxH1v9p`) — READY, алиас `intgetion.com` смотрит на неё. Повторно не выкладывалось.
- Команды проверки: `GET https://intgetion.com/billing/crypto?plan=plus` → 307 на `/login?next=billing-plus`, итоговая страница 200, в HTML `data-dpl-id` этой выкладки. Имена Tron и Solana есть только в словаре переводов, не отдельным блоком кассы. Адресов в странице нет. Публичный TronGrid `getnowblock` с этой машины → HTTP 200; Solana `getHealth` → `ok`. Эти вызовы шли не из функции Vercel. Деньги не переводились. `pnpm db:migrate` не запускался.
- P-тесты подфазы: нет в этой сессии (код D384 уже был в `d1a2875`).
- Миграции: нет
- Изменённые файлы: статус после READY оставлен локально в `docs/CURRENT.md` и этой записи, без второго push, чтобы не заменить готовую выкладку.
- Отклонения от ТЗ: нет
- OPEN QUESTION: ответит ли публичный RPC из сети Vercel, не проверялось: чтение квитанции запускается только после входа и идентификатора транзакции. Чужой ключ не подставлялся.
- Следующая подфаза: только по команде основателя. Языки, Telegram D381, карты, возврат, WalletConnect и D328 не начинать.

## [2026-10-09] — locale-de2 (немецкий, D373, перенос на актуальную базу) — DONE

- Сделано: немецкий `de` на `/de/...` заново от origin/master 42412c5 в папке `Integetion jobs locale-de2`, ветка `claude/locale-de2`. Старая ветка `claude/locale-de` (от f89ad97) не вливалась и не перебазировалась. Код взят диффом `f89ad97..5e397d1` только по исходникам (без docs, `de.json`, `legal.json` и шаблонов), лёг без конфликтов. `de.json` собран по текущему en.json: 1661 строка из 5e397d1 — только где английский ключ с f89ad97 не менялся (изменённых нет); 7 новых ключей (ссылки компании, D372) переведены. Юридические тексты английского с f89ad97 не менялись — немецкие секции те же. `legal.json` и `supabase/templates` перегенерированы. D373 перенесено в конец DECISIONS тем же номером.
- Проверено на dev-сервере :3200: `/de`, `/de/terms`, `/de/privacy` → 200, `lang="de"`; переключатель показывает «Deutsch» текущим; юрлицо «wird noch angegeben».
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` (с `NEXT_PUBLIC_SITE_URL=http://localhost:3000`) → 0, 835 тестов, 1 пропущен (`decide.test.ts` в этот раз уложился в таймаут; файл не менялся).
- P-тесты подфазы: messages de, legal de, письмо de, шаблоны (15 ссылок), бот de/de-at, seo/indexnow `/de` ✅
- Миграции: `src/db/migrations/0043_locale_de.sql` (users, notification_emails, telegram_login_challenges, auth_email_waits; на облако не применена)
- Изменённые файлы: см. `git status` в `Integetion jobs locale-de2`. Не закоммичено.
- Отклонения от ТЗ: нет
- OPEN QUESTION: Impressum / BDSG для `/de` — к юристу (как в D373).
- Следующая подфаза: по команде основателя («следующая»): французский от этой ветки.

## [2026-10-09] — locale-fr2 (французский, D374, перенос поверх немецкого) — DONE

- Сделано: немецкий закоммичен локально в `claude/locale-de2` (455e471, без push). Папка `Integetion jobs locale-fr2`, ветка `claude/locale-fr2` от 455e471. Французский `fr` на `/fr/...`: код взят диффом `5e397d1..ee07de0` только по исходникам (без docs, `fr.json`, `legal.json` и шаблонов), лёг без конфликтов; в `de.json` добавлены только подписи FR / Français / Französisch. `fr.json` собран по текущему en.json: 1664 строки из ee07de0 — только где английский ключ не менялся (изменённых нет); 7 новых ключей (ссылки компании, D372) переведены. Английские юридические тексты не менялись — французские секции те же, дословные. `legal.json` и `supabase/templates` перегенерированы. D374 перенесено в конец DECISIONS тем же номером.
- Проверено на dev-сервере :3300: `/fr`, `/fr/terms`, `/fr/privacy` → 200, `lang="fr"`; переключатель — шесть языков, «Français» текущий; юрлицо «à préciser»; `/de` по-прежнему 200.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` (с `NEXT_PUBLIC_SITE_URL=http://localhost:3000`) → 0, 839 тестов, 1 пропущен.
- P-тесты подфазы: messages fr, legal fr, письмо fr, шаблоны (18 ссылок), бот fr/fr-fr/fr-ca/fr-be/fr-ch, seo/indexnow `/fr` ✅
- Миграции: `src/db/migrations/0044_locale_fr.sql` (те же четыре таблицы, en, ru, es, pt-BR, de, fr; на облако не применена)
- Изменённые файлы: см. `git status` в `Integetion jobs locale-fr2`. Французский не закоммичен.
- Отклонения от ТЗ: нет
- OPEN QUESTION: mentions légales / CNIL для `/fr` — к юристу.
- Следующая подфаза: по команде основателя («следующая»).

## [2026-10-09] — locale-it (итальянский, D379) — DONE

- Сделано: французский закоммичен локально в `claude/locale-fr2` (744348e, без push). Папка `Integetion jobs locale-it`, ветка `claude/locale-it` от 744348e. Итальянский `it` на `/it/...` по образцу fr: routing, `it-IT`, каталоги, схемы Drizzle, письма (шаблоны Supabase, темы `config.toml`, подтверждение домена), бот (тексты, кнопки, вход через Telegram, `it*` → `it`, язык в промпте), SEO, RSS. `it.json` переведён целиком с текущего en.json (fr.json не использовался); подписи IT / Italiano во всех каталогах, в de и fr добавлены только они. Юридические тексты: секции `<!-- it -->` дословно с английского, `legal-sync`, `legalText`. D379 в конце DECISIONS.
- Найдено и исправлено: в `legal.test.ts` проверка плейсхолдеров de/fr была ослаблена при прошлом переносе (`/{{w+}}/g` ничего не находило). Восстановлена как `/\{\{\w+\}\}/g` и проверяет de, fr, it; все проходят. В `messages.test.ts` импорт итальянского назван `itMessages`, чтобы не затенять `it` из vitest.
- Проверено на dev-сервере :3400: `/it`, `/it/terms`, `/it/privacy` → 200, `lang="it"`; переключатель — семь языков, «Italiano» текущий; юрлицо «da specificare»; `/de` и `/fr` → 200.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` (с `NEXT_PUBLIC_SITE_URL=http://localhost:3000`) → 0, 843 теста, 1 пропущен.
- P-тесты подфазы: messages it, legal it (свой текст, те же плейсхолдеры и разделы, `/it/privacy`), письмо it, шаблоны (21 ссылка), бот it/it-it/it-ch, seo/indexnow `/it`, схема отклоняет `nl` ✅
- Миграции: `src/db/migrations/0045_locale_it.sql` (users, notification_emails, telegram_login_challenges, auth_email_waits; en, ru, es, pt-BR, de, fr, it; на облако не применена)
- Изменённые файлы: см. `git status` в `Integetion jobs locale-it`. Итальянский не закоммичен.
- Отклонения от ТЗ: нет
- OPEN QUESTION: требования итальянского права (Garante, Codice del consumo) для `/it` — к юристу.
- Следующая подфаза: по команде основателя («следующая»).

## [2026-10-12] — footer-company (группа Company в подвале, D396) — NOT DONE

- Сделано: папка `Integetion jobs footer-company`, ветка `claude/footer-company` от origin/master 91353ce. В подвале группа Company: About Us → `/company`, Feedback, Email Support, Ambassador Program, Media & Press Kit, API Access, Verify Official Accounts — текстом, Terms & Privacy Policy → `/terms`. Группы: Platform, Resources, Company, Sites (Portfolio), Legal (без изменений). Сетка `lg:grid-cols-5`, на узком экране две колонки. Данные групп вынесены в `footer-groups.ts`. Девять новых ключей `footer.*` на семи языках.
- Проверено на dev-сервере :3000 (сайт из этой папки): `/terms` при 1440 — пять колонок по 163 px, восемь пунктов Company в порядке, About Us → `/company`, Terms & Privacy Policy → `/terms`, ровно одна ссылка с именем Terms of Use (`/terms`) и одна Privacy Policy (`/privacy`), Cookie settings на месте; `/de/terms` при 1024 и 375 и `/ru/terms` при 640 — ни одна подпись не обрезана, за край ничего не выходит.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 1: одно предупреждение `@next/next/no-img-element` в `src/modules/jobs/ui/hire-form.tsx:318` — файл не менялся, совпадает с origin/master (91353ce); `eslint --max-warnings 0` по изменённым файлам → 0; `pnpm test` без `NEXT_PUBLIC_SITE_URL` → 1 (8 падений: письма входа требуют переменную, и legal.test); `NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm test` → 1: 915 прошли, 2 упали — `legal.test.ts` (рабочая копия свежей папки получила CRLF через `core.autocrlf=true`; в git файлы с LF, разница только `\r\n`) и `decide.test.ts` (таймаут 5 с, отдельно 8/8 зелёные). `footer-groups.test.ts` и `messages.test.ts` → 27/27. e2e локально не запускались.
- P-тесты подфазы: `footer-groups.test.ts` (порядок групп, английский дословно, адреса, шесть без ссылки, Legal/Portfolio/Platform/Resources на месте, ключи на семи языках) ✅
- Миграции: нет
- Изменённые файлы: `src/components/shell/footer.tsx`, `src/components/shell/footer-groups.ts` (новый), `src/components/shell/footer-groups.test.ts` (новый), `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `tests/e2e/legal.spec.ts`, `docs/DECISIONS.md`, `docs/CURRENT.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: `legal.spec.ts` — локаторы ссылок подвала стали `exact: true`, иначе «Terms & Privacy Policy» совпадает с «Privacy Policy» по подстроке (D396). Старая ссылка «Company» в группе Sites заменена пунктом About Us (D396).
- OPEN QUESTION: адреса для Feedback, Email Support, Ambassador Program, Media & Press Kit, API Access, Verify Official Accounts (D396). Предупреждение lint в `hire-form.tsx` на master — чинить отдельной задачей.
- Следующая подфаза: только по команде основателя.

## [2026-10-14] — agent-rules (аудит скиллов, безопасная зона, D405) — DONE

- Сделано: аудит скиллов Cursor (32 плагина в `~/.cursor/plugins/cache/cursor-public`, 24 встроенных в `~/.cursor/skills-cursor`), скиллов Claude Code (`~/.claude/skills`), `~/.cursor/mcp.json`, `.cursor/rules/spec.mdc`, `.claude/settings.local.json`. Копий скиллов в репозитории нет. В `AGENTS.md`: правило 9, разделы Safe zone, Skills (таблица выбора), Before complex changes, Reuse first, Checks after every change, Final report; «Finish the asked outcome» — один общий вопрос вместо выкладки без спроса (D405). `spec.mdc` выровнен. Из локального allowlist Claude Code сняты `git push *` и `git merge *`.
- Команды проверки: см. отчёт сессии (prettier --check на изменённых .md/.mdc, pnpm lint, pnpm typecheck, pnpm test).
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: AGENTS.md, .cursor/rules/spec.mdc, docs/DECISIONS.md, docs/CURRENT.md, MISSION_LOG.md; локально `.claude/settings.local.json` (git-ignored)
- Отклонения от ТЗ: нет
- OPEN QUESTION: в `~/.cursor/mcp.json` GitHub PAT открытым текстом в аргументах `github-mcp-server`; в этой сессии он попал в вывод инструмента. Перевыпуск токена — за основателем. Отключение нерелевантных плагинов Cursor (1inch, Clerk, Firebase и др.) — за основателем.
- Следующая подфаза: только по команде основателя.

## [2026-10-14] — security-skill (скилл безопасности проекта, D419) — NOT DONE (ждёт «да» на установку плагина)

- Сделано: инвентаризация (плагины Claude Code из `claude-plugins-official`, `~/.claude/skills`, Cursor `~/.cursor/plugins/cache/cursor-public` и `~/.cursor/skills-cursor`, проектные `.claude/skills`). Написан проектный скилл `.claude/skills/intgetion-security/SKILL.md`. Строка в таблице Skills в `AGENTS.md`, строка в `.cursor/rules/spec.mdc`. Предложен к установке плагин `claude-security@claude-plugins-official`; не установлен — нужно «да» основателя.
- Команды проверки: `pnpm exec prettier --check` по изменённым файлам — см. отчёт сессии.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `.claude/skills/intgetion-security/SKILL.md` (новый), `AGENTS.md` (одна строка таблицы), `.cursor/rules/spec.mdc`, `docs/DECISIONS.md` (D419), `MISSION_LOG.md`
- Отклонения от ТЗ: в `docs/tz/16-security.md` написано «`dangerouslySetInnerHTML` запрещён (lint)», а в коде он есть для скрипта темы, Telegram-хеша и JSON-LD; скилл разрешает только эти постоянные случаи.
- OPEN QUESTION: ставить ли `claude-security` (и на уровне пользователя или проекта); `security-guidance` — нет по умолчанию (D419).
- Следующая подфаза: только по команде основателя.

## [2026-10-14] — walletconnect-style (стили QR-модалки на кассе, D420) — NOT DONE (на сайт не выложено по слову основателя)

- Сделано: найдена причина, почему QR WalletConnect не работает. На `/billing/crypto` живая политика — `style-src 'self' 'nonce-…' 'unsafe-inline'`; при nonce браузер игнорирует `'unsafe-inline'`, а AppKit (`@reown/appkit-ui`, `ThemeUtil.initializeTheming`) добавляет в `<head>` четыре `<style>` без nonce — они блокировались, модалка без темы. На кассе `style-src 'self' 'unsafe-inline'` без nonce; `script-src` с nonce (Next.js берёт nonce только из `script-src`). Остальные страницы без изменений. Основатель сказал не выкладывать: исправление только в рабочей папке, без коммита.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (1034 прошли, 1 пропущен); `pnpm build` (с `SWC_NATIVE_BINDING_CACHE`) → 0; `vitest run src/lib/security.test.ts` → 24/24. В браузере касса не открывалась: нужен вход, пароль агент не вводит.
- P-тесты подфазы: `security.test.ts` — в `style-src` кассы нет nonce, `script-src` с nonce и без `unsafe-inline` ✅
- Миграции: нет
- Изменённые файлы: `src/lib/security-headers.ts`, `src/lib/security.test.ts`, `.cursor/skills/walletconnect/SKILL.md`, `docs/DECISIONS.md` (D420), `docs/CURRENT.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: D406 описывал `'unsafe-inline'` рядом с nonce как рабочий вариант — исправлено в D420.
- OPEN QUESTION: выкладка. Push в `master` соберёт сайт из git и снимет живую форму `/company#contact` выкладки `dpl_6i3h…` из рабочей папки.
- Следующая подфаза: только по команде основателя.

## [2026-10-14] — design-a11y (планка доступности в скилле дизайна, D421) — DONE

- Сделано: разобран `plugin87/ux-ui-agent-skills` (v2.9.8). Плагин не ставится: хуки и разрешения спорят с безопасной зоной, чужие стили — с нашим видом, остальное уже установлено (`design:*`). Навык `a11y-audit` отдельно не работает без всего набора. Планка WCAG 2.2 AA своими словами добавлена в `.claude/skills/intgetion-design/SKILL.md` (раздел Accessibility, строка в Check, триггеры в description).
- Команды проверки: `pnpm exec prettier --check` по изменённым файлам — см. отчёт сессии.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `.claude/skills/intgetion-design/SKILL.md`, `AGENTS.md` (одна строка таблицы), `docs/DECISIONS.md` (D421), `docs/CURRENT.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: нет
- OPEN QUESTION: контраст `--fg-muted` и `--line-strong` в обеих темах не замерялся; аудит страниц по `design:accessibility-review` — отдельной задачей по команде основателя.
- Следующая подфаза: только по команде основателя.

## [2026-10-14] — walletconnect-metamask (MetaMask раньше QR, иконки кошельков, D422) — NOT DONE (ждёт «да» на коммит и выкладку)

- Сделано: найдены две причины. 1) `connectWallet` при непустом Project ID всегда открывал QR-модалку `@walletconnect/ethereum-provider`, которая знает только WalletConnect; установленный MetaMask не предлагался. 2) AppKit показывает иконки кошельков как `blob:` (`URL.createObjectURL` в `ApiController._fetchWalletImage`), а в `img-src` кассы `blob:` не было — на сайте его нет и сейчас. Исправлено: поиск кошелька браузера через EIP-6963 (MetaMask первым, потом `window.ethereum`), QR только без расширения или по второй кнопке `billing.payQr`; `blob:` в `img-src` только на кассе. Project ID проверен без вывода значения: `getWallets` и `getWalletImage` → 200 для `intgetion.com` и `localhost:3000`.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (1039 прошли, 1 пропущен); `pnpm build` → 0 (с `SWC_NATIVE_BINDING_CACHE`; без него 1 из-за прав кеша SWC, не из-за кода); `curl` заголовков `/billing/crypto`: localhost с `blob:`, intgetion.com без.
- P-тесты подфазы: `connect-wallet.test.ts` — MetaMask из EIP-6963 открывается без QR, QR без расширения и по выбору «телефон»; `security.test.ts` — `blob:` в `img-src` кассы и нигде больше ✅
- Миграции: нет
- Изменённые файлы: `src/modules/billing/ui/connect-wallet.ts`, `connect-wallet.test.ts`, `crypto-pay.tsx`, `src/lib/security-headers.ts`, `src/lib/security.test.ts`, `src/messages/{en,ru,de,es,fr,it,pt-BR}.json` (`billing.payQr`), `.cursor/skills/walletconnect/SKILL.md`, `docs/DECISIONS.md` (D422), `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: нет. Браузерная проверка кассы не сделана: страница требует входа, агент пароли не вводит, в браузере агента нет MetaMask.
- OPEN QUESTION: при нескольких расширениях берётся MetaMask или первое ответившее — выбора нет (D422).
- Следующая подфаза: только по команде основателя.

## [2026-10-14] — security-audit (журнал проверок безопасности, D424) — DONE

- Сделано: полный аудит по чек-листу `intgetion-security` на `c122d70` + рабочая папка (D413/D416/D417/D420/D422/D423). Заведён `docs/security/AUDIT_LOG.md` (13 областей, 13 находок: Medium 3, Low 5, Info 5). Ссылки — `docs/README.md`, скилл `intgetion-security` (читать журнал первым; описание `enable_rls_deny_all` исправлено). Открытые находки — `docs/OPEN_TASKS.md`. Код не менялся: всё значимое касается auth, billing с миграцией или лимитов (решение основателя).
- Команды проверки: `pnpm exec prettier --check` по изменённым документам — см. отчёт сессии; `pnpm audit --prod` → нет уязвимостей; `pnpm audit` → 1 high в dev-зависимости `braces`; Supabase security advisors (чтение) — нет таблиц без RLS, 2 предупреждения; `curl -sI` на `/`, `/billing/crypto`, `/api/health`; встроенный `/security-review` — диф `c122d70` только документы, находок нет. typecheck/lint/test не запускались: код не менялся.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `docs/security/AUDIT_LOG.md` (новый), `docs/README.md`, `.claude/skills/intgetion-security/SKILL.md`, `docs/OPEN_TASKS.md`, `docs/DECISIONS.md` (D424), `docs/CURRENT.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: найдены SEC-20261014-1 (админка без MFA до `ADMIN_HOST_ONLY`), -2 (захват хэша транзакции), -3 (гостевой лимит Spoki через cookie)
- OPEN QUESTION: включён ли `ADMIN_HOST_ONLY` на проде — значения Vercel env не читались.
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — telegram-phone-login (D426) — NOT DONE (ждёт «да» на коммит и выкладку, затем проверку с телефона)

- Сделано: разобраны три симптома с телефона. Два одинаковых сообщения — один `/start login_<код>` обрабатывается дважды, второе нажатие на сайте подменяет куку другим кодом. «Вход уже открыт» писалось, когда подтверждён только код в базе: на телефоне страница уходила на `t.me` и опрос замирал. Mini App не вызывал `WebApp.ready()` и ждал около секунды. Исправлено локально: одно сообщение на код, та же ссылка при повторном нажатии, вкладка сайта остаётся и дожимает вход при возврате, текст бота не обещает готовую сессию, `ready()` и ожидание до 5 с на первой странице Mini App и на `tg.html`.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (1058 прошли, 1 пропущен); `pnpm build` → 0. Браузер: `http://localhost:3000/ru/login`, кнопка «Войти через Telegram» оставляет ту же страницу, кнопка блокируется, статус «Ждём подтверждения в Telegram…». Живой бот и телефон не трогались.
- P-тесты подфазы: `telegram-login-webhook.test.ts`, `telegram-login-open.test.ts`, `telegram-web-app-boot.test.ts`, `telegram-login-wait.test.ts` ✅
- Миграции: нет
- Изменённые файлы: `src/modules/auth/service/telegram-login.ts`, `src/modules/auth/repo/telegram-login.ts`, `src/modules/auth/__tests__/telegram-login-webhook.test.ts`, `telegram-login.integration.test.ts`, `src/app/api/auth/telegram/start/route.ts`, `src/components/auth/telegram-login-button.tsx`, `telegram-login-open.ts`, `telegram-login-resume.tsx`, `telegram-mini-app.tsx`, `social-sign-in-stubs.tsx`, `src/components/settings/sign-in-methods.tsx`, `src/app/[locale]/layout.tsx`, `src/proxy.ts`, `src/proxy.test.ts`, `src/lib/telegram-login-wait.ts`, `src/lib/telegram-web-app-boot.ts`, `public/tg.html`, `src/messages/{en,ru,es,pt-BR,de,fr,it}.json`, `docs/DECISIONS.md` (D426), `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: нет. Пустой `username` до подтверждения означает «кнопка уже отправлена», отдельной колонки и миграции нет (D426).
- OPEN QUESTION: адрес меню в BotFather (корень или `/tg.html`) не читался.
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — telegram-iphone-webview (D427) — NOT DONE (на сайт не выложено, с телефона ещё не проверено)

- Сделано: обычный браузер после D426 входит. Встроенное окно Telegram на iPhone учётную запись само не брало: подписанная строка есть только на первом документе Mini App, а сессию ставил `fetch`, чью куку этот webview не хранит. Теперь первая страница отправляет строку формой и получает редирект с сессией. Кнопка входа внутри окна Telegram не подменяет страницу. Обычная ссылка в браузере Telegram учётную запись не передаёт — это не Mini App.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (1059 прошли, 1 пропущен); `pnpm build` → 0. Телефон после этой правки ещё не смотрел: на сайте её нет.
- P-тесты подфазы: `telegram-web-app-boot.test.ts` ✅
- Миграции: нет
- Изменённые файлы: `src/lib/telegram-web-app-boot.ts`, `src/components/auth/telegram-mini-app.tsx`, `telegram-login-button.tsx`, `mini-app-open.ts`, `src/app/api/auth/telegram/miniapp/route.ts`, `public/tg.html`, `docs/DECISIONS.md` (D427), `docs/OPEN_TASKS.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: нет
- OPEN QUESTION: адрес меню в BotFather по-прежнему не читался. Токена бота в локальном `.env.local` нет.
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — nextjs-look (D428) — DONE (коммит 9cefb01, на сайте dpl_3rwETid1U879ttwQZ4zaEcd4qvfd)

- Сделано: по прототипу в стиле nextjs.org переделан вид всей платформы. Новые токены и шкала шрифтов в `globals.css`. Шрифты Geist и Geist Mono. Кнопки, поля, бейджи, карточки, диалоги, таблицы и тосты в `components/ui` скруглены. Обновлены шапка и подвал. Главная получила героя с белым контурным INTGETION, блок возможностей с точечными картинками, полосу тарифов и финальный призыв. Лента вакансий осталась (D332). Название белое в тёмной теме.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (1059 прошли, 1 пропущен); `pnpm build` → 0; `prettier --check` по своим файлам → 0 после `--write` трёх файлов. Браузер `localhost:3000`: `/ru` на 375 и 1280, светлая и тёмная тема. По DOM: `/ru/login`, `/ru/pricing`, `/ru/for-employers`, `/ru/jobs` — ширина 375 без вылезания, Geist, кнопки-пилюли, поля 6 px. В консоли ошибки CSP про inline style и повтор имени `company-mark-*` у ViewTransition: компании с двумя вакансиями в ленте. Обе ошибки не связаны с этой правкой.
- P-тесты подфазы: нет (только вид); тест каталогов сообщений проходит с новым `home.landing`.
- Миграции: нет
- Изменённые файлы: `src/app/fonts.ts` (новый), `src/app/globals.css`, `src/app/[locale]/layout.tsx`, `src/app/(admin)/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/components/home/{hero-wordmark,dot-art,landing}.tsx` (новые), `src/components/ui/{button,field,choice,badge,job-card,company-mark,dialog,feedback,table,toast,logo}.tsx`, `src/components/shell/{header,footer}.tsx`, `src/modules/companies/ui/company-form.tsx`, `src/modules/jobs/ui/hire-form.tsx`, `src/messages/*.json` (`home.landing`), `docs/DECISIONS.md` (D428), `docs/DESIGN.md`, `.claude/skills/intgetion-design/SKILL.md`, `docs/CURRENT.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: вид D140–D149 и шрифт D144 заменены решением D428 по прямому слову основателя.
- OPEN QUESTION: в светлой теме название тёмное, не белое — белое на белом не видно.
- Выкладка: пуш `5cd4ad72..9cefb013`. Перед пушем точный коммит выгружен в чистую папку: typecheck 0, lint 0, test 0 (1028 прошли). Vercel `success`. На https://intgetion.com/ru новый H1, Geist, белое название, синяя кнопка. GitHub CI `check` падает на `pnpm format:check` (11 файлов, в том числе `en.json` и `DESIGN.md`). Так же он падал на трёх прошлых коммитах `445a98f`, `90a2b36` и `5cd4ad7`: D428 новых ошибок формата не добавил.
- После: коммит `32898517` отформатировал 11 файлов, CI `check` зелёный, Vercel `dpl_4wnHXNEtszX21ie3B1htmYfXYEku`. Job `database` (e2e) красный и до D428: было 41 падение на `5cd4ad7`, стало 42. Новое — `home.spec.ts` «Russian shell» ждал старый H1. Ожидания H1 в `tests/e2e/home.spec.ts` обновлены под D428 в коммите `d40a384f`. CI на нём: `check` зелёный, Vercel `success`, `database` 41 падение — столько же, сколько до D428 на `5cd4ad7`. «Russian shell» проходит. Ещё два теста главной падали и раньше: в английском две ссылки «INTGETION JOB LIST» (strict mode), в CI-базе нет блока «All jobs».
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — telegram-iphone-account (D429) — NOT DONE (на сайт не выложено, с телефона ещё не проверено)

- Сделано: после D427 на сайте встроенное окно Telegram учётную запись всё ещё не привязывает. Локально кука сессии с телефона ставится страницей 200, а не редиректом 303. Та же подписанная строка пробуется второй раз, если первая кука не села; кнопка «Войти через Telegram» в эти две попытки не входит. Подпись HMAC принимается и без поля `signature`, и вместе с ним. Идентификатор цифрами в кавычках принимается. В лог пишется только `ok` или `invalid`.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (1063 прошли, 1 пропущен); `pnpm build` → 0. Живой телефон и бот не трогались.
- P-тесты подфазы: `telegram.test.ts`, `telegram-web-app-boot.test.ts`, `mini-app-open.test.ts` ✅
- Миграции: нет
- Изменённые файлы: `src/app/api/auth/telegram/miniapp/route.ts`, `src/modules/auth/service/telegram.ts`, `src/lib/telegram-web-app-boot.ts`, `src/components/auth/telegram-mini-app.tsx`, `src/components/auth/mini-app-open.ts`, `public/tg.html`, тесты этих файлов, `docs/DECISIONS.md` (D429), `docs/OPEN_TASKS.md`, `docs/CURRENT.md`, `docs/security/AUDIT_LOG.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: нет
- OPEN QUESTION: адрес меню в BotFather по-прежнему не читался. Токен бота на Vercel чувствительный, в чат не выводился.
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — telegram-iphone-account (D429) — DONE

- Сделано: основатель подтвердил с телефона, что встроенное окно Telegram привязывает учётную запись. Выкладка `dpl_BrekfwaV7XgD8U3YonQWKUtsFJXn`, коммит `5cd4ad7`.
- Команды проверки: живой телефон основателя. Локальные `typecheck`, `lint`, `test`, `build` прошли до пуша, см. запись выше.
- P-тесты подфазы: те же, что у выкладки
- Миграции: нет
- Изменённые файлы: статус в `docs/OPEN_TASKS.md`, `docs/CURRENT.md`, `docs/DECISIONS.md` (D429), `MISSION_LOG.md`
- Отклонения от ТЗ: нет
- OPEN QUESTION: адрес меню в BotFather по-прежнему не читался.
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — chat-keyboard (D431) — NOT DONE (на сайт не выложено)

- Сделано: на телефоне, пока человек пишет Spoki, нижнее меню уходит и поле садится на клавиатуру. Заголовок чата и строка про ошибки на это время скрываются. Полоса «привязать почту» на странице чата этой ширины больше не торчит из-под меню. После закрытия клавиатуры меню возвращается.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (1071 прошли, 1 пропущен). В браузере на 390×844 флаг `data-keyboard` прячет меню и заголовок, низ колонки `0`, под полем 18 px. Живую клавиатуру iPhone этот браузер не поднимает.
- P-тесты подфазы: `src/components/bot/keyboard-inset.test.ts` ✅
- Миграции: нет
- Изменённые файлы: `src/app/globals.css`, `src/components/bot/chat.tsx`, `src/components/bot/keyboard-inset.ts`, `src/components/bot/keyboard-inset.test.ts`, `docs/DECISIONS.md` (D431), `docs/CURRENT.md`, `docs/OPEN_TASKS.md`, `MISSION_LOG.md`
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — ci-database-e2e — NOT DONE (e2e зелёные; задача `database` красная только на LCP главной, это отдельная задача)

- Сделано: задача CI `database` была красной с 2026-10-07: 41 тест падал, 1 нестабильный. Тесты устарели после D331, D345, D373, D376 и D399, поэтому они поправлены под текущий сайт, без пропусков и без ослабления проверок. При регистрации выбирается тип аккаунта «Я ищу работу» (D331). Адреса проверяются без `/en` (D345). Логотип ищется в шапке. Тест ленты на главной сам создаёт 4 вакансии. Проверка 404 у RSS идёт на `/xx/`, потому что `/de` теперь язык сайта (D373). Вместо «Imported from» проверяется блок «In our words» (D376). В нижнем меню телефона 4 ссылки (D399). Название раздела админки может идти с числом открытых дел. admin-a2 сбрасывает сессию перед следующей регистрацией. На главной кнопка поиска снова 44px (D421): убран `min-h-10!`.
- Команды проверки: `pnpm typecheck` → 0; `pnpm test` → 0 (1063 прошли, 1 пропущен); eslint и prettier на изменённых файлах → 0. CI на master `2bd789eb`, run 38739211995: `check` ✅; `database`: e2e 82 прошли, 1 нестабильный (auth: агент помнит гостя), упала Lighthouse главной: медиана LCP 2824 мс при бюджете 2500 (D41, D145). LCP-элемент — надпись героя D428 (`.hero-wordmark-run`), задержка отрисовки около 2,5 с.
- P-тесты подфазы: нет
- Миграции: нет
- Изменённые файлы: `src/app/[locale]/page.tsx`, 23 файла `tests/e2e/*.spec.ts`, `MISSION_LOG.md`, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`. Коммиты `eb6458ae`, `2bd789eb`. Выкладка `intgetion-job-list-4wf1gxcwc` — Production, success; на https://intgetion.com кнопка поиска 44px.
- Отклонения от ТЗ: нет. В 14:54 кто-то вернул мои 24 файла в рабочей папке к старому виду. Коммиты это не задело, файлы восстановлены из HEAD.
- OPEN QUESTION: нет. LCP главной вынесен в отдельную задачу (решение основателя 2026-10-15), см. OPEN_TASKS.
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — phone-menu-wallet — NOT DONE (на сайте `dpl_DdZN6AnU6wgHLce6BJpjUz3t9pwE`, с телефона ещё не проверено)

- Сделано: меню телефона по приоритету и новые знаки (`28d098de`). Окно кошелька на весь экран без размытия, Solana и Tron скрыты (`be995b8e`).
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (1077 прошли, 1 пропущен); `pnpm build` → 0.
- P-тесты подфазы: nav-icons, connect-wallet, non-evm ✅
- Миграции: нет
- Изменённые файлы: меню, connect-wallet, globals.css, networks.ts, касса, скилл WalletConnect, D432 и D433
- Отклонения от ТЗ: нет
- OPEN QUESTION: нет
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — home-lcp — NOT DONE (правка лежит локально; бюджет 2500 ею не достигается, нужен выбор основателя и «да» на ветку)

- Сделано: разбор LCP главной (D434). Надпись героя не опаздывает: она в первом кадре с текстом. Lighthouse (lantern) считает в LCP весь HTML, шрифты и весь JS Next, выполненный до этого кадра. D428 добавил 66 КБ шрифтов в предзагрузке и ~37 КБ разметки точек дважды. Правка без смены вида: предзагрузка только Geist Latin (`src/app/fonts.ts`), точечные картинки узором (`src/components/home/dot-art.tsx`), адреса каталога и вакансии без `/en` в `scripts/ci-ui.sh` (шаг иначе падал на «no public job to measure»).
- Команды проверки: `pnpm typecheck` → 0; eslint на изменённых файлах → 0; prettier на изменённых → 0; `bash -n scripts/ci-ui.sh` → 0; `pnpm test` → 0 (1077 прошли, 1 пропущен); production-сборка HEAD + правка в отдельной копии → 0. `pnpm lint` и `pnpm build` в общей папке не запускались: там чужие незакоммиченные правки, сборка проверена на копии HEAD. CI не запускался: пуш ветки требует «да» основателя.
- Замеры (Lighthouse 12.8.2, флаги CI, системный Chrome, лента 5 вакансий — документ как в CI): главная HEAD 3426 → правка 3201 мс (медиана из 5). Локально всё на ~480 мс выше CI → в CI ожидается ~2740. Каталог 3859 и вакансия 3605 мс на HEAD (бюджет 4000).
- Попутно: на проде `https://intgetion.com/` и `/en` любой браузер получает страницу Mini App (D322, D426) и ждёт до 5 с данных Telegram, прежде чем уйти на `/?tgb=1`. Это отдельная задача.
- Миграции: нет
- Изменённые файлы: `src/app/fonts.ts`, `src/components/home/dot-art.tsx`, `scripts/ci-ui.sh`, D434, `docs/CURRENT.md`, `docs/OPEN_TASKS.md`
- Отклонения от ТЗ: нет
- OPEN QUESTION: как довести главную до 2500 — сменить вид (шрифт над первым экраном), пересмотреть бюджет D41 или отдельная работа над клиентским JS. Решение основателя.
- Следующая подфаза: только по команде основателя.

## [2026-10-15] — вкладка событий с ветки Claude (D435, D436)

- Сделано: наработки `claude/epic-newton-g38sje` (`73936e4b`, `4aecf749`) влиты в `master`. Вкладка «События», страницы `/events` и `/events/[slug]`, cron `/api/cron/events`, Spoki `find_events` и карточка на `/events`. На ветке это было D413/D414 и миграция `0048_events.sql`. На `master` эти номера заняты услугами, поэтому здесь D435, D436 и `0049_events.sql`. Живой источник confs.tech не включён: нужно одобрение основателя и `EVENTS_IMPORT_SOURCES`. Пока таблицы нет на облаке, каталог пустой и страница не падает.
- Команды проверки: `pnpm typecheck` → 0; `pnpm lint` → 0; `pnpm test` → 0 (1116 прошли, 1 пропущен); `pnpm eval` → 0; `pnpm build` → 0.
- P-тесты подфазы: events query, confs.tech, import, bot memory, tools, nav-icons ✅. Интеграционный тест events — в CI, локально Docker нет.
- Миграции: `0049_events.sql` в git. На облако не применялась: согласованного пути нет.
- Скиллы: intgetion-import, intgetion-security, intgetion-supabase, intgetion-design.
- Отклонения от ТЗ: код выложен раньше миграции, чтобы вкладка открывалась пустой, а не ответом 500.
- OPEN QUESTION: второй источник для Web3 (в confs.tech его почти нет). Как применить `0049` на облако.
- Следующая подфаза: только по команде основателя.
