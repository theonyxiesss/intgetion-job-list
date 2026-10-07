# Jobs & applications — как устроено

ТЗ: [../tz/06-api.md](../tz/06-api.md), модель [../tz/04-data.md](../tz/04-data.md).

## Код

- Jobs: `src/modules/jobs/**` — CRUD, publish, expire cron
- Applications: `src/modules/applications/**` — только `transitionApplication()`
- Contacts / reveal: `src/modules/contacts/**` + express-interest (D3)
- Listing/filters: `/api/jobs`, pages `/jobs`, `/jobs/[id]`

Импорт: `src/modules/ingestion/**` + [../tz/13-import.md](../tz/13-import.md).
