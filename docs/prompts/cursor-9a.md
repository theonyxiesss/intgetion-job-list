Ты — Cursor. Твоя подфаза: **9A** проекта INTGETION JOB LIST — уведомления: in-app и email, настройки, отписка. Агент: `cursor`, ветка `cursor/9a`, папка `C:\Users\Admin\Documents\Integetion jobs 9A`, миграция `src/db/migrations/0013_*.sql`, решения D125–D129.

5C ты сдал, она сейчас на проверке у интегратора. Формально 9A зависит от 5C, поэтому начни worktree **от `origin/cursor/5c`**, а не от `master`:

```bash
git fetch origin
git worktree add "../Integetion jobs 9A" -b cursor/9a origin/cursor/5c
```

Когда 5C окажется в `master` (смотри `MISSION_LOG.md`), сделай `git rebase origin/master`. Если интегратор попросит поправить 5C, правь в ветке `cursor/5c`, а потом перебазируй 9A на неё.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и выполняй их порядок работы.

Прочитай в `docs/TZ_INTGETION_v6.md`: 22 (строка 9A), 15 целиком, 4.1 (`notifications`, `notification_preferences`), 7 (`/api/notifications*`), 8 (`/notifications`, `/settings/notifications`), 17 (retention `notifications`: прочитанные 90 дней); решения D16, D23, D25 и D100–D104 (9A-lib от GLM, лежит в `src/modules/notifications/lib/`) в `docs/DECISIONS.md`.

## 9A по ТЗ

Раздел 22: in-app + email, preferences, события раздела 15, батчинг, отписка. Вне скоупа: проактивность бота и дайджест совпадений (9B, нужны 6B и 7A). DoD: preferences соблюдаются (тест); шаблоны en/ru.

- **Миграция 0013:** `notifications` и `notification_preferences` по 4.1, RLS через `public.enable_rls_deny_all()`. Для email добавь таблицу исходящих писем, например `notification_emails` (`id`, `notification_id` или ключ батча, `user_id`, `type`, `locale`, `status` `pending|sent|skipped|failed`, `attempts`, `send_after`, `sent_at`, `error`). Её нет в 4.1, поэтому запиши её в D125.
- **Очередь (D25):** pg-boss пока не ставим. Ему нужна своя схема и права, которых у `app_rw` нет, а первым он по-настоящему нужен в 6B. Очередь email — это таблица исходящих писем плюс cron `/api/cron/notifications`: `Bearer CRON_SECRET`, без секрета → 404, образец — `src/app/api/cron/expire-jobs/route.ts`. Пачка не больше 50 писем, `FOR UPDATE SKIP LOCKED`, повтор с backoff, не больше 5 попыток. Расписание добавь в `vercel.json`. Запиши в D125, что pg-boss отложен до 6B и почему.
- **Модуль `src/modules/notifications`:** `service/notify.ts`: `notify(type, recipients, payload)`. Он проверяет payload схемой из `lib/catalog` (D100), пишет строку `notifications` для in-app, а email ставит в очередь по `resolveDelivery` (D102). `application.created` батчится по часу UTC через `lib/batch`: одно письмо на получателя на час. Логика — в `service/`, только запросы — в `repo/`. Никакого состояния в памяти.
- **Отправка email:** интерфейс `EmailSender`. Если задан `RESEND_API_KEY`, Resend шлётся через `fetch` на `https://api.resend.com/emails` без SDK, отправитель — `EMAIL_FROM`. Без ключа работает `NoopEmailSender`: письмо помечается `skipped`, наружу ничего не уходит. В CI и локально ключа нет. Шаблоны — простые HTML и текст из строк `notifications.types.*.email` (D104), на языке получателя (`users.locale`). Подключать React Email не нужно, это отдельное решение (D126). В каждом письме, кроме auth-писем, должна быть ссылка отписки. Переменные `RESEND_API_KEY`, `EMAIL_FROM`, `UNSUBSCRIBE_SECRET` добавь в `.env.example` с пустыми значениями. Секреты в код и в отчёт не пиши.
- **Где вызывать события.** Вызывай только из сервисов, не из route-файлов:
  - `application.created`, `application.viewed`, `application.status_changed`, `application.withdrawn` — в сервисе откликов (5A/5B);
  - `mutual_interest.revealed` — после коммита транзакции express-interest (5C);
  - `job.closed` — кандидатам с активными откликами, когда вакансия переходит в `closed`. Это одна строка вызова в сервисе вакансий 3B: Codex сегодня недоступен, разрешаю;
  - `job.expiring` — отдельный cron `/api/cron/job-expiring`, раз в сутки, за 3 дня до `expires_at`, без повторов для той же вакансии.
  - События, которых ещё нет: `job.moderation_decided` и `report.decided` появятся в 10A, `company.verification_decided` — в 10B, `matches.digest` — в 9B. Для них только экспортируй `notify` и перечисли их в отчёте.
  - Уведомление не должно ломать основное действие: ошибка `notify` логируется (`logger` из `src/lib/logger.ts`), но отклик или переход статуса не откатывает. Опиши это в D127.
- **API (раздел 7):** `GET /api/notifications` — курсор раздела 6 и `unreadCount`. `POST /api/notifications/read` `{ ids[] } | { all: true }` — только свои уведомления, чужие id молча игнорируются. `GET|PUT /api/notifications/preferences` — по типу и каналу, только типы из каталога. Везде `requireUser`. В payload нет email, телефона и telegram (D16).
- **Отписка (D103):** `UNSUBSCRIBE_SECRET`, токен из `lib/unsubscribe`. Страница `/[locale]/unsubscribe?token=` показывает тип и кнопку. Кнопка делает `POST /api/notifications/unsubscribe` — это выключает email для этого типа. Без входа, срок жизни токена 30 дней. Неверный или просроченный токен → 404.
- **UI:**
  - `/[locale]/notifications` — лента с «прочитать все»;
  - счётчик непрочитанных в шапке. Это `src/components/shell/header.tsx` — разрешаю добавить туда одну ссылку со счётчиком, больше ничего в шапке не меняй;
  - `/[locale]/settings/notifications` — переключатели по типам и каналам.
  - Строки — под ключами `notifications` (D104 уже занял `notifications.types.*` и `notifications.unsubscribe.*`) и `notificationSettings`.
- **Retention:** прочитанные уведомления старше 90 дней удаляет тот же `/api/cron/notifications`.

## Правила

- Не трогай файлы Claude Code (список в PARALLEL_WORK, правило 5). Изменения в `src/lib/rate-limit.ts`, `proxy.ts` или `src/modules/auth/**` опиши в отчёте, сам не делай.
- e2e импортируют `test`/`expect` из `tests/e2e/fixtures.ts`; второй пользователь — `newContextWithIp(browser)`.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-cursor' pnpm build`.
- При конфликте в `pnpm-lock.yaml` во время rebase возьми версию из `master` и запусти `pnpm install`. После конфликтов в `src/messages/*.json` проверь, что JSON валиден и ключи en/ru совпадают.
- Запись в `MISSION_LOG.md` обязательна: это пункт DoD.

## Тесты

- **Unit:**
  - выбор канала по preferences и умолчаниям;
  - выключенный email не ставит письмо в очередь, а in-app всё равно пишется;
  - батч `application.created` даёт одно письмо на получателя за час;
  - `NoopEmailSender` → `skipped`;
  - шаблоны en/ru рендерятся для каждого типа с email;
  - в письме есть ссылка отписки.
- **Интеграция:**
  - событие отклика создаёт уведомление работодателю (recruiter+) и, когда это нужно, письмо в очереди;
  - **preferences соблюдаются (DoD)**;
  - cron забирает письма с `SKIP LOCKED`: два параллельных вызова не отправляют одно письмо дважды;
  - ошибка отправителя увеличивает `attempts`, после 5 попыток → `failed`;
  - сбой `notify` не откатывает отклик;
  - retention удаляет только прочитанные старше 90 дней.
- **e2e:**
  - кандидат откликается → работодатель видит уведомление и счётчик в шапке;
  - «прочитать все» обнуляет счётчик;
  - выключение email в `/settings/notifications` сохраняется;
  - отписка по ссылке из очереди выключает email-канал;
  - чужие уведомления не читаются (`POST read` с чужим id ничего не меняет).

Отчёт по шаблону раздела 0 ТЗ: с выводом команд, ссылкой на зелёный CI ветки `cursor/9a` и выводом `git log --oneline origin/master..origin/cursor/9a`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
