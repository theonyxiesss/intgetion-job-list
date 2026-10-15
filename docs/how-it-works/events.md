# События (D413)

Агрегатор событий Web3 и IT. ТЗ: [../tz/26-events.md](../tz/26-events.md).

## Код

| Что                               | Где                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Константы (темы, виды, источники) | `src/config/events.ts`                                                          |
| Схема и миграция                  | `src/db/schema/events.ts`, `src/db/migrations/0048_events.sql`                  |
| Вход модуля                       | `src/modules/events/service/index.ts`                                           |
| Адаптер confs.tech                | `src/modules/events/adapters/confs-tech.ts`, страна — `adapters/country.ts`     |
| Фикстура                          | `fixtures/events/fictional-events.json`, `adapters/fixture.ts`                  |
| Прогон импорта                    | `src/modules/events/service/import.ts`, cron `src/app/api/cron/events/route.ts` |
| Запросы                           | `service/filter.ts` (правила), `repo/events-repo.ts` (SQL)                      |
| Страницы                          | `src/app/[locale]/events/page.tsx`, `src/app/[locale]/events/[slug]/page.tsx`   |
| Spoki                             | `find_events` в `src/modules/bot/service/tools.ts`, `offer_step` `events`       |

## Импорт

1. `/api/cron/events` (каждые 6 ч, `50 */6 * * *`) с `CRON_SECRET`.
2. `EVENTS_IMPORT_SOURCES` пуст → фикстура, и только при базе на `localhost`/`127.0.0.1`/`::1`. Иначе пропуск с `fixtures_skipped`.
3. Источник в списке → строка в `import_sources` (через `registerFeedSource` из `ingestion/service`). Выключенная строка или интервал (confs.tech — 12 ч) → пропуск. Один источник за вызов, самый давний первым.
4. confs.tech: файлы `conferences/<год>/<тема>.json` за этот и следующий год; 404 — тема пропускается, другой код — ошибка прогона. Одна конференция в нескольких темах сливается в одно событие с объединёнными темами. Закончившиеся не берутся.
5. Отказ строке: нет названия, ссылка не http(s), неверная дата, конец раньше начала, офлайн без места.
6. Upsert по `(source, external_id)`: slug не меняется, `removed` остаётся `removed`, `expired` снова публикуется, если событие снова в ленте и ещё впереди.
7. После записи — `expired` для закончившихся и не виденных 30 дней. Метрики — в `import_runs`.

## Темы и вид из confs.tech

Тема файла даёт базовую тему (`javascript` → `dev`, `data` → `data`, `security` → `security`, `leadership` → `business` …). Название добавляет `web3`, `ai`, `career`. Вид: «summit» → summit, «hackathon» → hackathon, «meetup» → meetup, карьерные слова → career, «business breakfast/mixer…» → business, иначе conference. В confs.tech почти нет Web3: для Web3 нужен второй источник (OPEN QUESTION D413).

## Показ

Даты без времени — целые сутки UTC, `Intl.DateTimeFormat` с `timeZone: "UTC"`. Страна хранится кодом и показывается `Intl.DisplayNames` на языке страницы. Формат «онлайн» в фильтре включает гибрид, «офлайн» тоже. Spoki без страны получает только онлайн и гибрид; со страной и удалённой работой — страну или онлайн.

## Включить на сайте

1. Миграция `0048_events.sql` на облако (сначала она, потом код).
2. Выкладка кода.
3. Одобрение основателя в MISSION_LOG, затем `EVENTS_IMPORT_SOURCES=confs.tech` в Vercel production и выкладка.
