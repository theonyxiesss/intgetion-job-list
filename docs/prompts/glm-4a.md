Ты — GLM. Твоя подфаза: **4A** проекта INTGETION JOB LIST. Агент: `glm`, ветка `glm/4a`, папка `C:\Users\Admin\Documents\Integetion jobs 4A`, миграция `src/db/migrations/0007_*.sql`, решения D65–D69.

Сначала прочитай `docs/prompts/_common.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй его порядок работы.

Зависимость: 3B должна быть в `origin/master`. Пока её нет — ничего не делай и ответь «ЖДУ: 3B».

## 4A по ТЗ

Раздел 22: `/jobs`, `/jobs/[id]`, фильтры (tz-overlap, зарплата по D4/D5), FTS, курсорная пагинация, seed 5k, `/companies/[slug]`, главная с живыми данными, `fx_rates` + cron. Вне скоупа: matching (6A), save/hide (4B). DoD: perf p95 < 500 ms; unit фильтров. Риск: производительность FTS.

- `GET /api/jobs` и `GET /api/jobs/:id` по разделу 7 (не-published → 404, кроме членов компании и админа; imported → с `source{name,url}`). Карточка — раздел 9.2.
- Фильтры раздела 7: `q, category, skills[], workFormat[], employmentType[], tzOverlapWith + minOverlap, salaryMin+currency+period+basis, country, source, postedWithin, sort`. Зарплата строго по D4/D5: несравнимые вакансии остаются и помечаются, gross/net не сравниваются, hour ни во что не конвертируется, курс старше 7 дней — нейтрально. Пересечение часов — раздел 10.6 (IANA, DST, полночь, D6).
- FTS + индексы; курсорная пагинация `{ items, nextCursor }`, limit ≤ 50, по умолчанию 20 (раздел 6).
- `fx_rates` (`numeric(18,8)`, D19) + cron `/api/cron/fx-rates` раз в сутки (`Bearer CRON_SECRET`, без секрета → 404). Источник курсов должен быть официальным API без ключа или с ключом в env; если нужен ключ — интерфейс + тестовый двойник + BLOCKED в отчёте.
- Seed 5 000 опубликованных вакансий в `src/db/seed/` (идемпотентный) и perf-скрипт: `/api/jobs` p95 < 500 ms server-side (раздел 3.4, 19.1). Если p95 не укладывается — это провал DoD, так и пиши.
- Страницы `/[locale]/jobs`, `/[locale]/jobs/[id]`, `/[locale]/companies/[slug]`. На главной блок «последние вакансии» из пустого состояния (D35) становится живым: файл `src/app/[locale]/page.tsx` можно менять только в этом блоке. Строки — под ключами `jobs` и `companyPage`.
- Бюджет главной: LCP < 2.5 s, JS < 150 KB gz. CI уже меряет LCP; сейчас ~2.2 s — не ухудшай.

## Тесты

Unit: каждый фильтр, все нейтральные случаи D4/D5, tz-overlap с DST и полночью, курсор. Интеграция: поиск на seed. e2e: листинг, фильтр, страница вакансии, 404 на чужой draft. axe на `/jobs` и `/jobs/[id]` без critical.
