Ты — Cursor. Твоя подфаза: **6B** проекта INTGETION JOB LIST — рекомендации для кандидата: API, страница `/matches`, «почему подходит» на вакансии, обратная связь и пересчёт при публикации. Агент: `cursor`, ветка `cursor/6b`, папка `C:\Users\Admin\Documents\Integetion jobs 6B`, миграция `src/db/migrations/0016_*.sql` (если понадобится), решения D160–D164.

6A и UI-2 приняты и влиты в `master` — спасибо, обе хорошего качества. Параллельно Claude Code делает 10C (приватность) — его файлы (`src/modules/privacy/**`, `/settings/privacy`, `/settings/account`, `DELETE /api/me`, `GET /api/me/export`, retention-cron) не трогай.

```bash
git fetch origin
git worktree add "../Integetion jobs 6B" -b cursor/6b origin/master
```

Сначала прочитай `docs/prompts/_common.md`, `docs/PARALLEL_WORK.md`, `docs/DESIGN.md` (особенно 6, 8.5, 9.0, 9.3, 13) и в `docs/TZ_INTGETION_v6.md`: 10 целиком (особенно 10.1, 10.5, 10.7), 7 (`/api/matches`), 8 (`/matches`, `/jobs/[id]`), 3 (перф-бюджет `/api/matches`), 22 (строка 6B); решения D25, D30, D90–D94 (score), D110–D114 (feedback 4B), D125 (очередь 9A), D150–D154 (твоя 6A), D140–D145 и D41a/D41b (дизайн, импорты, клиентские строки).

## 6B по ТЗ

Раздел 22: feedback loop (10.5), `/api/matches`, `/matches`, «почему подходит» на странице вакансии, пересчёт при публикации. DoD: `dismissed` понижает категорию; `hidden_company` исключает.

- **API** (раздел 7):
  - `GET /api/matches` — только кандидат (есть профиль; нет — 404 или пустой ответ с `lowData: true`, выбери и запиши в D160). Ответ `{ items: [{ job, score, explain[] }], lowData }`, только `score ≥ 0.55`, `job` — публичный DTO из 4A (не держи свой), курсор раздела 6. Внутри — `getMatches` из 6A.
  - `POST /api/matches/:jobId/feedback` `{ action: "dismissed", reason? }` — пишет `user_job_feedback` через сервис 4B, сбрасывает кэш пользователя (следующий `GET` пересчитает). Лимит — разумный (`rateRules` не меняй; нужен новый — опиши в отчёте).
- **Feedback loop 10.5** — проверь, что множители из `user_job_feedback` (hidden/dismissed по категории `×0.9ⁿ` не ниже 0.6; навыки из сохранённых/откликнутых `+0.03` до `×1.15`; `hidden_company` → исключение) реально доходят до `breakdown.feedback`. Если что-то из этого не сделано в 6A/6A-score — доделай. Подсказка «обновить поле профиля» после ≥ 3 скрытий с причиной `salary|format|timezone` — флаг в ответе `GET /api/matches` (`profileHints: ["salary", …]`), UI показывает Alert со ссылкой на `/profile/edit#…`.
- **Пересчёт при публикации вакансии**: когда вакансия становится `published` (публикация, одобрение модерации, продление), её нужно досчитать для кандидатов из префильтра (`computeMatchesForJob` из 6A, ≤ 2 000). pg-boss не ставим (D125: у `app_rw` нет прав на свою схему, на Vercel нужен воркер) — сделай так же, как очередь писем 9A: таблица задач + cron `/api/cron/matching` (`Bearer CRON_SECRET`, без секрета → 404, пачка не дольше ~50 с, `FOR UPDATE SKIP LOCKED`, повтор). Запиши в D161, что D25 (pg-boss) окончательно заменён этим подходом для MVP. Постановка задачи — одна строка вызова в месте, где вакансия становится `published` (сервис вакансий 3B и решение очереди модерации 10A — `src/modules/moderation/service/queue-service.ts`, case `approve_job`; это файл Claude Code — разрешаю добавить один вызов, больше ничего не меняй).
- **UI** (новый дизайн, только `@/components/ui`):
  - `/[locale]/matches`: вкладки «Все · Новые · Скрытые» (DESIGN 9.0, `?tab=`), `JobCard` + бейдж совпадения (процент mono, `--signal`), до 4 пунктов explain под карточкой (иконка по `verdict`: matched `Check`/`--success`, partial — `--warning`, neutral — `--fg-subtle`, failed — `--danger`), кнопка «Не подходит» → причина (Dialog с `Choice`) → `POST …/feedback`; `lowData` — EmptyState «Заполните профиль» со ссылкой на `/profile/edit`.
  - `/jobs/[id]`: блок «Почему подходит» в правой панели (для вошедшего кандидата; гость не видит; нет совпадения ≥ 0.55 — блок не показывается).
  - Пункт «Подходящие» в шапке для кандидата (DESIGN 9.0, таблица ролей) — шапка — файл Claude Code (`src/components/shell/header.tsx`): разрешаю добавить ровно этот пункт в навигацию и в мобильное меню.
  - Тексты explain — ключи `explain.*` (часть уже есть в `messages`), en/ru.
- **Правила дизайна**: никаких `style={...}` (CSP); клиентские компоненты импортируют кит по файлам (`@/components/ui/button`), не из индекса; если клиентский компонент читает строки через `useTranslations("x")` — добавь `x` в `CLIENT_NAMESPACES` в `src/app/[locale]/layout.tsx` (D41b), иначе строки не дойдут до браузера.

## Правила

- Не трогай файлы Claude Code (PARALLEL_WORK, правило 5), кроме двух разрешённых выше точек.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-cursor' pnpm build`. При конфликте в `pnpm-lock.yaml` — версия из `master` + `pnpm install`; после конфликтов в `messages` — JSON валиден, ключи en/ru совпадают.
- Запись в `MISSION_LOG.md` обязательна.

## Тесты

- **Unit**: сборка ответа `/api/matches` (порог 0.55, курсор, `profileHints`), очередь пересчёта (повтор, SKIP LOCKED-логика на уровне сервиса).
- **Интеграция (DoD)**: `dismissed` в категории понижает score следующей вакансии этой категории; `hidden_company` исключает все вакансии компании; публикация вакансии ставит задачу, cron досчитывает её для подходящего кандидата, и она появляется в `GET /api/matches`; два параллельных cron не считают одну задачу дважды; перф `GET /api/matches` p95 < 300 ms из кэша, < 1500 ms холодный на seed 5k.
- **e2e**: кандидат с профилем видит `/matches` с хотя бы одной вакансией и explain; «Не подходит» убирает вакансию из вкладки «Все» и показывает её в «Скрытые»; гость на `/matches` → `/login`; на `/jobs/[id]` у кандидата есть «Почему подходит», у гостя — нет; 360 px без горизонтальной прокрутки; axe без critical/serious.

Отчёт по шаблону раздела 0 ТЗ: вывод команд, ссылка на зелёный CI ветки `cursor/6b`, `git log --oneline origin/master..origin/cursor/6b`, скриншоты `/matches` и блока «Почему подходит» (1440 и 375).
