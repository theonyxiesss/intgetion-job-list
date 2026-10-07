# Импорт (ingestion)

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

## 13. ИМПОРТ (INGESTION)

### 13.1 Пайплайн
```
Source (API/RSS) → Fetch (таймаут 15 c, ≤ 500 записей/прогон, уважать rate limits источника)
 → Parse → Normalize → Dedup → Auto-moderation → Upsert (source=imported) → Matching-задача
```
- Адаптер источника: `interface ImportAdapter { fetch(): AsyncIterable<RawJob>; map(raw): NormalizedJob }`.
- 8A: адаптеры на фикстурах `fixtures/import/<source>/*.json|xml`, 10–20
  реалистичных записей на источник, включая дубли, scam-пример, вакансию без
  зарплаты, вакансию с tz-требованием.
- 8B: живой источник — только при записи в MISSION_LOG (D18) и
  `IMPORT_LIVE_ENABLED=true`; источник включается в `/admin/import`.
  Конкретные источники и их ToS — OPEN QUESTION для основателя.

### 13.2 Нормализация
- Навыки → канон (11.1); нераспознанное → `skill_suggestions`, в вакансию не
  пишется.
- Зарплата → минорные единицы (D19); если в тексте только «$100k» —
  `year`, `gross` по умолчанию **не предполагаются**: basis = null → зарплатный
  компонент нейтрален.
- Таймзона: только явное IANA или однозначное сопоставление («CET» →
  `Europe/Paris` — по таблице в `src/lib/tz-aliases.ts`); иначе null.
- Компания: поиск по домену → по trgm(name) ≥ 0.9 среди `origin='imported'`
  → иначе создаётся `origin='imported'`, `status='unverified'`. С internal-
  компаниями импорт **не сливается** автоматически (предотвращение захвата).
- `application_method='external_url'`, `application_url` = оригинал.

### 13.3 Дедупликация
- Ключ: `lower(unaccent(title)) | company_domain||company_name | location|'remote'`.
- Совпадение ключа или trgm(title) ≥ 0.85 у той же компании и trgm(description
  первые 500 символов) ≥ 0.8 → merge: обновление полей, добавление строки в
  `job_sources`. Дубли internal↔imported: imported скрывается (`removed`,
  reason `duplicate_of_internal`).
- Дубль-кейс в тестах обязателен.

### 13.4 Автомодерация и жизненный цикл
- Scam/spam-правила (`src/config/scam-patterns.ts`): предоплата/«оплата
  обучения», оплата в крипте, мессенджер вместо email для отклика, обещание
  дохода без опыта, сокращатели ссылок → `rejected` (в очередь админа на
  просмотр выборки).
- Нет записи в источнике 2 прогона подряд → `expired`.
- Редактирование работодателем запрещено, claim запрещён, бейджа нет (D9).
- `import_runs` пишет метрики каждого прогона (раздел 18).

---
