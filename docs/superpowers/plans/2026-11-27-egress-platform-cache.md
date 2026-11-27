# ТЗ, часть 1 (платформа): гостевая подборка, кэш публичных страниц, правила для ботов

> **Для исполнителя-агента:** обязательный навык — superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans. Шаги отмечаются чекбоксами (`- [ ]`).

**Цель:** повторные просмотры публичных вакансий гостями, ботами и подключённым ИИ не ходят в Supabase за тяжёлыми данными, при этом закрытая вакансия перестаёт показываться и предлагать отклик сразу.

**Архитектура:** новый модуль платформы `src/modules/public-cache` оборачивает публичные функции замороженного `@/modules/jobs/service` в кэш данных Next.js (`unstable_cache`) и добавляет лёгкую живую проверку статуса (только `id`, `status`, `expires_at`). Тяжёлое содержимое вакансии берётся из кэша, а актуальность — из запроса в ~100 байт, поэтому закрытие видно на следующем же просмотре без сброса кэша. Страницы `src/app`, MCP-инструменты бота и `robots.txt` переводятся на этот модуль. Код замороженных модулей не меняется.

**Стек:** Next.js 16.3.8 (App Router, `unstable_cache` из `next/cache`), Drizzle ORM, Vitest, pnpm.

**Стратегия:** `docs/superpowers/specs/2026-11-27-db-egress-strategy-design.md`

**Другие части ТЗ:** часть 2 — проверка жизни импортированных вакансий (`intgetion-ingestion`, миграция); часть 3 — стоимость пересчёта подбора (`intgetion-matching`). Пишутся отдельно; до сайта доходят вместе с подключением модулей к платформе.

**Решения автора ТЗ (отличия от буквы стратегии):**
- Первый экран `/jobs` у гостя — не срез гостевой подборки, а закэшированный на 5 минут ответ того же запроса по умолчанию: у каталога своя сортировка, лимит и курсор, и срез подборки сломал бы «показать ещё». Подборка (50 вакансий, как сейчас на главной) — на главной и в MCP-поиске без параметров.
- Закрытие видно сразу за счёт живой проверки статуса, а не сброса меток кэша: это не требует правок в замороженных путях закрытия (модерация, импорт, приватность). Метки (`job:<id>`, `guest-picks`, `catalog`) заводятся на будущее.
- Блок личных рекомендаций над общей подборкой для вошедших — не в этой части (зависит от части 3); вошедшие пока идут по текущему пути.

## Общие ограничения

- Не менять код замороженных модулей платформы: `src/modules/jobs` (кроме `ui/`, `service/hire-post.ts`, `service/jobs-alert.ts`), `src/modules/ingestion`, `src/modules/matching` (кроме `ui/`), `src/modules/feedback` (кроме `ui/`), `src/modules/mcp`, `src/modules/moderation`, `src/modules/privacy`, ядро `src/modules/notifications`. Разрешено: `src/app/**`, `src/modules/seo/**`, наборы инструментов бота (`src/modules/bot/service/{mcp-faces,job-tools,...}.ts`), новый модуль `src/modules/public-cache`, конфиги и скрипты.
- Свежесть: новая вакансия в гостевой подборке — не позже 15 минут; закрытая/истёкшая — не показывается в подборке и на своей странице со следующего просмотра (требование стратегии: 1–5 минут).
- Личные данные (скрытые/сохранённые вакансии, роль участника компании, сессия) никогда не попадают в ключ или содержимое общего кэша. Вошедший пользователь идёт по текущему некэшированному пути.
- Полный текст описания и разметка JobPosting на странице вакансии сохраняются.
- Без миграций платформы в этой части. Без push в `master`; каждая задача — коммит в ветку `fix/public-cache`, PR в `master` по «да» владельца.
- Коммиты от имени `Mark Evans`, без строк `Co-Authored-By` и `Generated with Claude Code`.
- PR #59 (без `fts` в публичных выборках, сделан в замороженном `src/modules/jobs`) — решение владельца: принять как срочное исключение или перенести в `intgetion-jobs`. Эта часть от него не зависит.

## Фокус ревью

1. Вакансию закрыли, пока она лежит в кэше страницы или подборки → следующий просмотр отдаёт 404 / не показывает её, кнопки отклика нет (Задачи 2, 3, 4).
2. У вакансии прошёл `expires_at`, а cron `expire-jobs` ещё не отработал → она считается неживой (Задача 2).
3. Вошедший пользователь со скрытыми вакансиями открывает `/jobs` или страницу компании → видит свою выдачу без скрытых, а не общий кэш (Задача 5).
4. Значение из кэша прошло через JSON (даты стали строками) → страница и MCP работают так же, как с некэшированным значением (Задача 3).
5. ИИ ищет то, чего нет → MCP-поиск возвращает пустой список с явным текстом «подходящих действующих вакансий нет», без «похожих» подстановок (Задача 6).

---

### Задача 1: Правила для ботов

**Файлы:**
- Изменить: `src/modules/seo/site.ts:95-101` (`AI_CRAWLERS`)
- Тест: `src/modules/seo/__tests__/robots.test.ts`

**Интерфейсы:**
- Даёт: `AI_CRAWLERS` с добавленными `"Reflectionbot"`, `"meta-externalagent"`, `"Applebot-Extended"`.

- [ ] **Шаг 1: Падающий тест** в `robots.test.ts`:

```ts
it("blocks training crawlers and keeps answer/search bots allowed", () => {
  const blocked = robots().rules.find((r) => r.disallow === "/")!.userAgent;
  for (const bot of ["Reflectionbot", "meta-externalagent", "Applebot-Extended", "GPTBot", "ClaudeBot", "CCBot", "Google-Extended"]) {
    expect(blocked).toContain(bot);
  }
  for (const bot of ["Claude-SearchBot", "OAI-SearchBot", "PerplexityBot", "Applebot", "Meta-WebIndexer", "Googlebot", "Bingbot"]) {
    expect(blocked).not.toContain(bot);
  }
});
```

- [ ] **Шаг 2:** `pnpm vitest run src/modules/seo/__tests__/robots.test.ts` → FAIL (нет Reflectionbot).
- [ ] **Шаг 3:** добавить три имени в `AI_CRAWLERS`, обновить комментарий над списком: «обучающие краулеры; поисковые боты для ответов людям идут под общим правилом».
- [ ] **Шаг 4:** тот же запуск → PASS.
- [ ] **Шаг 5:** коммит `Block training crawlers Reflectionbot, meta-externalagent and Applebot-Extended`.

### Задача 2: Живая проверка статуса

**Файлы:**
- Создать: `src/modules/public-cache/config.ts`, `src/modules/public-cache/live-state.ts`
- Тест: `src/modules/public-cache/__tests__/live-state.test.ts`, `src/modules/public-cache/live-state.integration.test.ts`

**Интерфейсы:**
- Даёт (`config.ts`): `GUEST_PICKS_SIZE = 50`, `GUEST_PICKS_REVALIDATE_S = 600`, `JOB_PAGE_REVALIDATE_S = 1800`, `COMPANY_REVALIDATE_S = 1800`, `CATALOG_SEARCH_REVALIDATE_S = 300`, `CACHE_KEY_VERSION = "v1"`.
- Даёт (`live-state.ts`):
  - `type LiveState = { status: string; expiresAt: Date | null }`
  - `isLive(state: LiveState | undefined, now: Date): boolean` — `true` только при `status === "published"` и (`expiresAt === null` или `expiresAt > now`).
  - `readLiveStates(ids: readonly string[]): Promise<Map<string, LiveState>>` — один запрос `select id, status, expires_at from jobs where id = any(...)`; пустой список → пустая карта без запроса. Только эти три колонки.
  - `filterLive<T extends { id: string }>(items: T[], now?: Date): Promise<T[]>` — сохраняет порядок, отбрасывает неживые и отсутствующие.

- [ ] **Шаг 1: Падающие тесты** (`live-state.test.ts`):

```ts
const now = new Date("2026-11-27T12:00:00Z");
expect(isLive({ status: "published", expiresAt: null }, now)).toBe(true);
expect(isLive({ status: "published", expiresAt: new Date("2026-11-27T12:00:01Z") }, now)).toBe(true);
expect(isLive({ status: "published", expiresAt: new Date("2026-11-27T11:59:59Z") }, now)).toBe(false);
expect(isLive({ status: "closed", expiresAt: null }, now)).toBe(false);
expect(isLive(undefined, now)).toBe(false);
```

Интеграционный (`live-state.integration.test.ts`, по образцу `src/modules/jobs/public-search.integration.test.ts`): создать опубликованную, закрытую и опубликованную-с-прошедшим-сроком вакансии; `filterLive([a, closed, expired, missingId])` → `[a]`; `readLiveStates([])` → размер 0.

- [ ] **Шаг 2:** `pnpm vitest run src/modules/public-cache` → FAIL.
- [ ] **Шаг 3:** реализовать `config.ts` и `live-state.ts` (Drizzle `jobs` из `@/db/schema`, только чтение).
- [ ] **Шаг 4:** юнит → PASS; интеграционный `pnpm test:integration -- src/modules/public-cache` на локальной базе (см. Задачу 7) → PASS.
- [ ] **Шаг 5:** коммит `Add live job state check for cached public reads`.

### Задача 3: Кэшированные публичные чтения

**Файлы:**
- Создать: `src/modules/public-cache/cached-reads.ts`, `src/modules/public-cache/index.ts`
- Тест: `src/modules/public-cache/__tests__/cached-reads.test.ts`, `src/modules/public-cache/cached-reads.integration.test.ts`

**Интерфейсы:**
- Потребляет: из `@/modules/jobs/service` — `getJobForPublic(id, { locale })`, `searchJobs(query, locale)`, `getVisibleCompany(slug)`, `listPublishedJobsForCompany(companyId, locale)` (без `viewer`, т. е. гостевой вид); из Задачи 2 — `readLiveStates`, `isLive`, `filterLive`, константы.
- Даёт:
  - `cachedJobForPublic(id: string, locale: string): Promise<PublicJob | null>` — содержимое из `unstable_cache` (ключ `["public-job", CACHE_KEY_VERSION, id, locale]`, `revalidate: JOB_PAGE_REVALIDATE_S`, тег `job:${id}`); затем `readLiveStates([id])`; неживая → `null`.
  - `cachedPublicSearch(query: JobSearchQuery, locale: string, options: { syndicatedOnly?: boolean } = {}): Promise<SearchResult>` — вызывает `searchJobs(query, locale, { hidden: null, syndicatedOnly })`; ключ `["public-search", CACHE_KEY_VERSION, locale, stableJson({ query, syndicatedOnly })]`, `revalidate: CATALOG_SEARCH_REVALIDATE_S`, тег `catalog`; запросы с `cursor` идут мимо кэша. Ответ проходит `filterLive` по `items`.
  - `cachedVisibleCompany(slug: string)` и `cachedCompanyJobs(companyId: string, locale: string)` — `revalidate: COMPANY_REVALIDATE_S`, теги `company:${slug}` / `company-jobs:${companyId}`; список вакансий проходит `filterLive`.
  - `PublicJob`, `SearchResult` — `NonNullable<Awaited<ReturnType<typeof getJobForPublic>>>` и `Awaited<ReturnType<typeof searchJobs>>`.
  - `stableJson(value: unknown): string` — JSON с отсортированными ключами объектов (одинаковые запросы с разным порядком полей → один ключ).

- [ ] **Шаг 1: Падающие тесты** (`cached-reads.test.ts`, `unstable_cache` замокан на прямой вызов, `@/modules/jobs/service` и `readLiveStates` замоканы):
  - `stableJson({ b: 1, a: { d: 2, c: 3 } }) === stableJson({ a: { c: 3, d: 2 }, b: 1 })`.
  - `cachedJobForPublic` возвращает `null`, если `readLiveStates` дал `{ status: "closed" }`, хотя `getJobForPublic` вернул вакансию.
  - `cachedPublicSearch` с `cursor` вызывает `searchJobs` напрямую и не вызывает `unstable_cache`.
  - `cachedPublicSearch` убирает из `items` вакансию, у которой живой статус `expired`.

Интеграционный (`cached-reads.integration.test.ts`): для опубликованной вакансии `JSON.parse(JSON.stringify(await getJobForPublic(id, { locale: "en" })))` глубоко равно результату `cachedJobForPublic(id, "en")`; то же для `searchJobs` / `cachedPublicSearch` — фиксирует, что значения переживают JSON (Фокус ревью 4).

- [ ] **Шаг 2:** `pnpm vitest run src/modules/public-cache` → FAIL.
- [ ] **Шаг 3:** реализовать `cached-reads.ts`, экспортировать всё через `index.ts`. `unstable_cache` создавать на уровне модуля по одной обёртке на функцию; аргументы обёртки входят в ключ автоматически.
- [ ] **Шаг 4:** юнит и интеграционный → PASS; `pnpm typecheck` → без ошибок.
- [ ] **Шаг 5:** коммит `Add cached public job, search and company reads with live status overlay`.

### Задача 4: Гостевая подборка

**Файлы:**
- Создать: `src/modules/public-cache/guest-picks.ts` (экспорт через `index.ts`)
- Тест: `src/modules/public-cache/__tests__/guest-picks.test.ts`

**Интерфейсы:**
- Потребляет: `searchJobs`, `listPromotedJobs(locale)` из `@/modules/jobs/service`; `filterLive`, константы.
- Даёт: `getGuestPicks(locale: string): Promise<{ promoted: FeedJob[]; items: FeedJob[] }>` — состав как у текущей ленты главной (`listPromotedJobs(locale)` + `searchJobs({ limit: GUEST_PICKS_SIZE, minOverlap: 3, sort: "newest" }, locale)`), в `unstable_cache` с ключом `["guest-picks", CACHE_KEY_VERSION, locale]`, `revalidate: GUEST_PICKS_REVALIDATE_S`, тег `guest-picks`; оба списка после кэша проходят `filterLive`. `FeedJob = SearchResult["items"][number]`.

- [ ] **Шаг 1: Падающие тесты:** закрытая после сборки вакансия не возвращается из `getGuestPicks` (живой статус `closed`); при пустом результате поиска — `{ promoted: [], items: [] }` без исключения.
- [ ] **Шаг 2:** запуск → FAIL.
- [ ] **Шаг 3:** реализовать.
- [ ] **Шаг 4:** запуск → PASS.
- [ ] **Шаг 5:** коммит `Add guest picks snapshot refreshed every 10 minutes`.

### Задача 5: Страницы на кэшированные чтения

**Файлы:**
- Изменить: `src/app/[locale]/page.tsx` (компонент `JobFeed`, строки ~45-60)
- Изменить: `src/app/[locale]/jobs/(list)/page.tsx:155-180`, `src/app/[locale]/jobs/(list)/jobs-v2.tsx:120-145`
- Изменить: `src/app/[locale]/jobs/[id]/page.tsx`, `src/app/[locale]/jobs/[id]/opengraph-image.tsx`
- Изменить: `src/app/[locale]/companies/[slug]/page.tsx` и его `opengraph-image.tsx`
- Тест: `src/modules/public-cache/pages.integration.test.ts`

**Интерфейсы:**
- Потребляет: всё из Задач 3–4.

Правила:
- Главная: `JobFeed` берёт `getGuestPicks(locale)` вместо прямых `listPromotedJobs` + `searchJobs`.
- `/jobs` (обе версии): если `viewer.hidden === null` (гость) — `cachedPublicSearch(parsed, locale)` и для промо без фильтров — `getGuestPicks(locale).promoted`; вошедший — текущий путь без изменений. `listSearchSkillOptions` не трогать.
- `/jobs/[id]`: и `generateMetadata`, и страница берут вакансию через `cachedJobForPublic(id, locale)`, обёрнутый в `React.cache` (одно чтение на запрос). Если `null` — оставить текущую ветку: для участника компании/админа — некэшированный `getJobForPublic(id, { userId, isAdmin, locale })` (черновики и закрытые видны своим), иначе `notFound()`. Личные блоки (`isJobSavedForUser`, `RelatedJobs` со скрытыми) остаются как есть.
- OG-картинка вакансии и компании: `cachedJobForPublic` / `cachedVisibleCompany` + `cachedCompanyJobs`.
- Страница компании: гость — `cachedVisibleCompany` + `cachedCompanyJobs`; вошедший — текущий путь со скрытыми.

Это задача подключения: поведение покрыто тестами Задач 2–4, здесь — регрессионный тест, который должен проходить и до, и после правок.

- [ ] **Шаг 1: Регрессионный тест** (`pages.integration.test.ts`): вызвать серверный `JobPage` для опубликованной вакансии → рендер без исключения; закрыть её прямым `update` статуса; вызвать снова → исключение `notFound` (digest `NEXT_HTTP_ERROR_FALLBACK;404`). То же для `getGuestPicks`: после закрытия вакансии нет в `items`.
- [ ] **Шаг 2:** запуск до правок → PASS (фиксирует текущее поведение).
- [ ] **Шаг 3:** внести правки в страницы по правилам выше.
- [ ] **Шаг 4:** `pnpm typecheck`, `pnpm lint`, `pnpm vitest run`, интеграционные → PASS.
- [ ] **Шаг 5:** ручная проверка в `pnpm dev`: главная, `/jobs`, `/jobs?q=engineer`, страница вакансии, страница компании открываются гостем и вошедшим; у закрытой вакансии гость получает 404.
- [ ] **Шаг 6:** коммит `Serve public job pages, catalog and company pages from the cache for guests`.

### Задача 6: Публичный поиск для ИИ (MCP)

**Файлы:**
- Изменить: `src/modules/bot/service/mcp-faces.ts:15-60` (`searchJobsFace`, `getJobFace`)
- Тест: существующий тест лиц MCP рядом (`src/modules/bot/service/__tests__/` — найти по `searchJobsFace`) или новый `mcp-faces.test.ts`

**Интерфейсы:**
- Потребляет: `cachedPublicSearch`, `cachedJobForPublic`, `getGuestPicks`.

Правила:
- `searchJobsFace.run`: если во входе нет ни текста, ни фильтров — `getGuestPicks("en").items`, дальше тот же `filter(canSyndicateJob)`; иначе `cachedPublicSearch(query, "en", { syndicatedOnly: true })`.
- Пустой результат: ответ содержит пустой список и поле `message: "No matching active jobs on INTGETION right now."` — без подстановки других вакансий.
- `getJobFace.run`: `cachedJobForPublic(id, "en")`; `null` → текущий ответ «не найдено».

- [ ] **Шаг 1: Падающие тесты:** пустой поиск → `items: []` и `message` выше; закрытая вакансия через `get_job` → «не найдено»; поиск без параметров использует подборку (мок `getGuestPicks` вызван, `cachedPublicSearch` — нет).
- [ ] **Шаг 2:** запуск → FAIL.
- [ ] **Шаг 3:** реализовать.
- [ ] **Шаг 4:** запуск → PASS.
- [ ] **Шаг 5:** коммит `Point public MCP job search at cached public data`.

### Задача 7: Защита облачной базы от тестов

**Файлы:**
- Создать: `scripts/guard-test-db.mts`
- Изменить: `vitest.integration.config.mts` (добавить `setupFiles: ["./scripts/guard-test-db.mts"]`)
- Тест: `scripts/guard-test-db.test.mts`

**Интерфейсы:**
- Даёт: `assertLocalTestDatabase(env: NodeJS.ProcessEnv): void` — бросает ошибку `Integration tests must not run against a hosted database (set ALLOW_HOSTED_DB_TESTS=1 to override)`, если хост в `DATABASE_URL` или `DATABASE_MIGRATION_URL` оканчивается на `.supabase.co` или `.supabase.com` (включая pooler) и `ALLOW_HOSTED_DB_TESTS !== "1"`. Модуль при импорте вызывает её для `process.env`.

- [ ] **Шаг 1: Падающие тесты:** хост `db.hwcdscobnmxatmjbmect.supabase.co` → бросает; `aws-0-eu-central-1.pooler.supabase.com` → бросает; `127.0.0.1:54322` → не бросает; облачный хост с `ALLOW_HOSTED_DB_TESTS=1` → не бросает.
- [ ] **Шаг 2:** запуск → FAIL.
- [ ] **Шаг 3:** реализовать (разбор через `new URL`).
- [ ] **Шаг 4:** запуск → PASS; `scripts/ci-db.sh` локальная база проходит.
- [ ] **Шаг 5:** дописать в `README.md` раздел «Интеграционные тесты»: только локальная база (`supabase start`), переменная-исключение.
- [ ] **Шаг 6:** коммит `Refuse to run integration tests against a hosted database`.

### Задача 8: Отчёт о расходе по потокам

**Файлы:**
- Создать: `scripts/egress-report.mjs`
- Изменить: `package.json` (скрипт `"egress:report": "node scripts/egress-report.mjs"`)
- Изменить: `docs/superpowers/specs/2026-11-27-db-egress-strategy-design.md` — раздел 5.7 ссылка на процедуру

**Интерфейсы:**
- Даёт: команду, которая читает `DATABASE_MIGRATION_URL` и печатает топ-20 запросов из `extensions.pg_stat_statements` по `rows` (с `calls`), с меткой потока по подстроке запроса: `job-page` (`"jobs"."id" = $` и `limit`), `catalog` (`order by "jobs"."published_at"`), `company` (`"jobs"."company_id" = $`), `live-state` (`select "id", "status", "expires_at"`), `import` (`md5(`), `matching` (`matching_`), иначе `other`. Флаг `--save <file>` пишет снимок JSON; `--diff <file>` печатает приращение с прошлого снимка.

- [ ] **Шаг 1:** реализовать скрипт (чистая функция `classifyQuery(sql: string): string` вынесена и покрыта тестом `scripts/egress-report.test.mjs` на шести метках выше).
- [ ] **Шаг 2:** тест → PASS.
- [ ] **Шаг 3:** описать в разделе 5.7 стратегии процедуру: снимок `--save` до выкладки, через 24 часа `--diff`, плюс дневной график Egress в Supabase Usage; критерий — около 150 МБ в день.
- [ ] **Шаг 4:** коммит `Add egress report script grouped by delivery stream`.

---

## После части 1 (не в этой ветке)

- Выкладка по «да» владельца, затем замер по Задаче 8 через 24 часа.
- Если расход выше цели — по цифрам решить: короткое описание в списках (требует правки `jobs` → модуль), блокировка непослушных ботов в Vercel Firewall (настройка проекта, по «да»), тариф Pro.
- Ежедневная сводка в Telegram — после первых замеров, отдельной задачей.
