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
- 8B (D375): живой источник — только официальный API или RSS, при записи
  в MISSION_LOG (D18) и `IMPORT_LIVE_ENABLED=true`. С флагом фикстуры не
  запускаются. Скрейпинг HTML запрещён. Google Jobs — не источник: это
  поиск Google, туда уходят только свои вакансии (D211).

### 13.1a Живые источники (одобрены основателем 2026-10-07, перенесены D375)

| Источник | Адрес | Условия | Как часто | Новых за запуск |
| --- | --- | --- | --- | --- |
| Remotive | `remotive.com/api/remote-jobs` | ссылка на страницу Remotive и имя; не в Google Jobs; не больше 4 запросов в день | раз в 6 ч | 15 |
| Himalayas | `himalayas.app/jobs/api` | ссылка и имя; не в Google Jobs; данные раз в сутки | раз в 6 ч | 15 |
| Jobicy | `jobicy.com/api/v2/remote-jobs` | Jobicy как источник и его ссылка | раз в 6 ч | 15 |
| Remote OK | `remoteok.com/api` | ссылка на Remote OK и имя; логотип нельзя | раз в 6 ч | 15 |

Не включены: We Work Remotely (их условия запрещают сайт, который заменяет их как место поиска), Arbeitnow (условия не найдены), CryptoJobsList (API только по заявке), web3.career (нужен ключ). Снимок 2026-10-04 с CryptoJobsList этим не пополняется.

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
- Редактирование работодателем запрещено, claim запрещён, бейджа «проверено» нет (D9).
- На публичном сайте слово «импортировано» не пишется (D376). Имя источника и ссылка на оригинал на открытой вакансии остаются.
- `import_runs` пишет метрики каждого прогона (раздел 18).

---
