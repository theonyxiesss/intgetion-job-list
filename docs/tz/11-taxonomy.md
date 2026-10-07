# Таксономия и полнота профиля

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

## 11. ТАКСОНОМИЯ И ПОЛНОТА ПРОФИЛЯ

### 11.1 Навыки
- Bootstrap: 80–120 канонических навыков в категориях `engineering, data,
  design, product, marketing, sales, support, operations, finance, hr`;
  у каждого `name_en`, `name_ru`, ≥ 2 алиаса.
- `normalizeSkill(raw)`: lower → trim → удалить версии/суффиксы (`.js`, `js`,
  цифры версий) и пунктуацию → поиск в `skills_aliases` → точное совпадение
  slug → trgm ≥ 0.85 с одним кандидатом → иначе `skill_suggestions`.
  Пример: `'React.js'`, `'ReactJS'`, `'react 18'` → `react`.
- LLM-маппинг (только импорт и бот): модель получает список канонических slug
  в категории и обязана вернуть slug или `null` (structured output); ответ
  валидируется по справочнику.
- Админ раз в неделю разбирает `skill_suggestions` (≥ 3 occurrences — сверху).

### 11.2 Категории вакансий
`jobs.category` ∈ списку категорий навыков; выбирается работодателем,
для импорта — по большинству навыков.

### 11.3 Формула полноты (сумма 100)

| Поле | % |
|------|---|
| full_name | 5 |
| headline | 10 |
| desired_titles ≥ 1 | 10 |
| timezone (обязательно для apply) | 10 |
| рабочие часы/дни подтверждены | 5 |
| ≥ 3 навыка (обязательно для apply) | 15 |
| experience_years | 10 |
| ≥ 1 язык | 10 |
| зарплатные ожидания (min + currency + period + basis) | 10 |
| work_formats + employment_types подтверждены | 5 |
| контактный email (обязательно для apply) | 10 |

Порог отклика — 60% + три обязательных поля (D15). Ответ 422 перечисляет
`missing[]` ключами i18n.

---
