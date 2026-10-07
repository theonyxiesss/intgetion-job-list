# Matching — как устроено

ТЗ: [../tz/10-matching.md](../tz/10-matching.md).

## Код

- `src/modules/matching/**` — hard-фильтры, компоненты скора, explain
- Результаты: таблица `matching_results`, API `/api/matches`, UI `/matches`
- Пересчёт при публикации — очередь pg-boss
- Деньги/TZ: `src/lib/money.ts`, `src/lib/tz.ts`

Эмбеддинги выключены (D11).
