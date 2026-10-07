# Matching v1

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

## 10. MATCHING v1

### 10.1 Конвейер
```
SQL-префильтр (hard-фильтры + ≥1 общий навык или категория, лимит 500)
 → скоринг в TS (чистые функции, src/modules/matching/score/*)
 → feedback-множители → штрафы → порог 0.55 → top-200 в matching_results
```
Пересчёт: по запросу `/api/matches`, если кэш старше 6 ч или
`candidate_profiles.updated_at > computed_at`; при публикации вакансии —
задача pg-boss считает её для кандидатов, прошедших SQL-префильтр (≤ 2 000).
`algo_version` инкрементится при изменении формул → кэш инвалидируется.

### 10.2 Hard-фильтры (исключают вакансию)
1. `job.work_format ∉ candidate.work_formats`.
2. `country_restrictions` не null и `candidate.country ∉` списка.
3. `job.employment_type ∉ candidate.employment_types`.
4. hybrid/onsite: `job.location_country ≠ candidate.country`.
5. `job.timezone_required` задан и среднее пересечение < `job.min_overlap_hours`.
6. Вакансия скрыта пользователем, компания скрыта пользователем, уже есть
   активный отклик, вакансия не `published`.

**Валюта и gross/net — НЕ hard** (D4, D5).

### 10.3 Компоненты скора (0..1) и веса

| Компонент | Вес | Формула | Нейтрально, если |
|-----------|-----|---------|------------------|
| skills | 0.35 | `Σ w_j·m_j / Σ w_j`, где `w_j` = job_skills.weight; `m_j` = 1 если навык есть и уровень ≥ min_level; 0.5 если есть, но уровень ниже; 0 — нет | у вакансии нет навыков |
| role/title | 0.15 | `max(similarity(desired_title_i, job.title))` (pg_trgm); если `job.category ∈ preferences.categories` → `max(·, 0.7)` | нет desired_titles и категорий |
| salary | 0.20 | раздел 10.4 | несравнимо (D4/D5) или нет данных у одной из сторон |
| tz overlap | 0.10 | `min(1, O / max(R,1))`, O — среднее пересечение (ч), R = max(job.min_overlap, cand.min_overlap) | нет timezone_required |
| experience | 0.10 | cand ≥ min → 1; cand = min−1 → 0.5; иначе 0; если задан max и cand > max+3 → 0.7 | experience_min null |
| languages | 0.10 | среднее по требуемым: уровень ≥ min → 1; на 1 ступень CEFR ниже → 0.5; иначе 0 | нет job_languages |

**Сборка:** `base = Σ wᵢ·sᵢ / Σ wᵢ` по ненейтральным компонентам (вес
перераспределяется пропорционально). Если `Σ wᵢ` активных < 0.4 → результат
помечается `lowData=true`.

**Штрафы:** каждый отсутствующий must-have навык (weight=3) → `×0.8`;
вакансия без зарплаты → `×0.95` (понижение ранга, v2).

**Feedback-множитель (10.5)** → `score = clamp(base × штрафы × feedback, 0, 1)`.
Порог показа: **≥ 0.55**.

### 10.4 Зарплата
1. Приведение периода: year → month `/12` (целочисленно, банковское округление
   в минорных единицах); hour не приводится. Разные периоды после приведения →
   нейтрально.
2. База: gross ≠ net → нейтрально (D5).
3. Валюта: одинаковая → сравнение напрямую; разная → через `fx_rates`
   (оба курса не старше 7 дней, арифметика в `numeric`/BigInt) → иначе нейтрально.
4. Пусть `J = job.salary_max ?? job.salary_min`, `C = cand.salary_min`.
   `J ≥ C` → 1; иначе `r = J/C`, `s = max(0, (r − 0.7)/0.3)`.
5. Функции денег — `src/lib/money.ts`, только BigInt; unit-тесты на
   округление, переполнение, нулевые значения.

### 10.5 Feedback loop
- `hidden_company` → компания исключается (hard).
- `hidden`/`dismissed` в категории за 90 дней, n событий → `×0.9ⁿ`, не ниже 0.6.
- Навык, встречающийся в ≥ 2 сохранённых/откликнутых вакансиях за 90 дней →
  `+0.03` за навык, суммарно не выше `×1.15`.
- Причина скрытия `salary`/`format`/`timezone` ≥ 3 раз → бот/UI предлагает
  обновить соответствующее поле профиля (не меняет его сам).
- Все множители пишутся в `breakdown.feedback`.

### 10.6 Пересечение часов (D6)
```
for day in next 14 days (по календарю UTC):
  if day ∉ candidate.work_days (в tz кандидата) → skip
  candWindow = [localToUtc(day, work_hours_start, cand.tz), localToUtc(day, work_hours_end, cand.tz)]
  jobWindow  = [localToUtc(day, job.work_hours_start ?? 09:00, job.tz), localToUtc(day, job.work_hours_end ?? 18:00, job.tz)]
  overlap += max(0, min(ends) − max(starts))
O = overlap / числоРабочихДней
```
- `localToUtc` через `Intl.DateTimeFormat(…, { timeZone })` — подбор смещения
  на конкретную дату; фиксированные смещения запрещены.
- Окна через полночь (end < start) поддерживаются.
- Тесты: Europe/Berlin ↔ America/New_York в недели расхождения перехода DST
  (март/октябрь–ноябрь), Asia/Kolkata (+5:30), Australia/Lord_Howe (сдвиг 30 мин),
  окно через полночь.

### 10.7 Explain (D30)
Массив `{ criterion, verdict: matched|partial|neutral|failed, detail }`, где
`detail` — ключ i18n + параметры, напр.
`{ "criterion":"salary", "verdict":"matched", "detail":{"key":"explain.salary.inRange","params":{"job":"5000–7000 USD/mo gross"}} }`.
Порядок: matched → partial → neutral → failed; в карточке — до 4 пунктов.

### 10.8 Метрики качества
CTR рекомендаций, apply rate из рекомендаций, dismissal rate, доля откликов
с ответом работодателя (≠ applied за 7 дней), доля `lowData`. Считаются
SQL-представлениями, показываются в `/admin/metrics`.

### 10.9 Semantic
`interface SemanticProvider { similarity(a: string, b: string): Promise<number|null> }`,
реализация `NoopSemanticProvider` → `null` (компонент не используется).
Эмбеддинги — отдельная подфаза после MVP (D11).

---
