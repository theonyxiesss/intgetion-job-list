# SEO и зарплаты — как устроено

Модули `src/modules/seo` (разметка для поисковиков) и `src/modules/salaries` (публичные страницы зарплат по навыкам).

## Что делает

- **seo** — общие помощники, своего `service/index.ts` нет: страницы импортируют файлы напрямую.
  - `site.ts`: адрес сайта, языковые версии адресов (`languageAlternates`), что закрыто для роботов (`ROBOTS_DISALLOW`) и каких роботов не пускать (`BLOCKED_CRAWLERS`).
  - `job-posting.ts`: разметка `JobPosting` для вакансии; `markup.ts`: хлебные крошки, FAQ, граф главной, краткое описание импортной вакансии.
  - `json-ld.tsx`: компонент вставки JSON-LD.
  - `og.ts`: картинки предпросмотра 1200×630 для вакансии, компании, тега, главной.
  - `indexnow.ts`: отправка новых адресов в IndexNow, ключ отдаёт `/indexnow-key.txt`.
  - `tag-label.ts`: подписи тегов и навыков.
- **salaries** — сводка зарплат по навыкам из опубликованных вакансий за 180 дней (`WINDOW_DAYS`), навык показывается от 10 вакансий (`MIN_JOBS_PER_SKILL`), строка уровня — от 5 (`MIN_JOBS_PER_ROW`); суммы приводятся к одной валюте по `fx_rates`.

## Главные файлы

| Модуль               | Где                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `seo`                | `src/modules/seo/site.ts`, `job-posting.ts`, `markup.ts`, `json-ld.tsx`, `og.ts`, `indexnow.ts`, `tag-label.ts` |
| `salaries`           | вход `src/modules/salaries/service/index.ts`, расчёт `service/stats.ts`, SQL `repo/salaries-repo.ts`            |
| Карта сайта и robots | `src/app/sitemap.ts`, `src/app/robots.ts`                                                                       |

## Таблицы и миграции

seo своих таблиц нет. salaries читает `jobs`, `job_skills` (`0006_jobs.sql`), `skills` (`0003_skills.sql`), `companies`, `fx_rates` (`0007_fx_rates_search.sql`).

## Маршруты и страницы

- seo используют: главная, `/jobs`, `/jobs/[id]`, `/jobs/t/[slug]`, `/companies/[slug]`, `/freelance`, `/freelance/[slug]`, `/events`, `/events/[slug]`, `/salaries`, `/salaries/[skill]`, `/pricing`, `/services`, `/company`, `/portfolio`, `/privacy`, `/terms`, все `opengraph-image.tsx`, `layout.tsx`, `/sitemap.xml`, `/robots.txt`, `/indexnow-key.txt`.
- При `UI_V2=true` главная показывает экран Spoki из `Main.dc.html` и `homeGraphJsonLd`. FAQ-разметка выводится только с прежним лендингом, где вопросы видны. Текст поля передаётся через существующий `HomeAsk` в чат; быстрые действия ведут на реальные маршруты.
- salaries: страницы `/salaries` и `/salaries/[skill]`, адреса в sitemap (`listSalarySkillSlugs`).

## Env (без значений)

`NEXT_PUBLIC_SITE_URL`, `INDEXNOW_KEY`, `GOOGLE_SITE_VERIFICATION`, `YANDEX_VERIFICATION`, `BING_SITE_VERIFICATION`.

## ТЗ и решения

ТЗ: [08-pages-ux.md](../tz/08-pages-ux.md).

D: 210, 211 (зарплаты), 218, 260, 276, 278, 281–284, 296–298, 300 (SEO и разметка), 335 (адреса без `/en`).

## Что не сделано

Открытых задач по модулям в `OPEN_TASKS.md` нет. Связанное: `/jobs/rss.xml` отвечает 404, лента на `/en/jobs/rss.xml` ([import.md](import.md)).
