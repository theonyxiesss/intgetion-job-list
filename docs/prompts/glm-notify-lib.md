Ты — GLM. Задача: чистые правила уведомлений для проекта INTGETION JOB LIST (раздел 15). Это выделенная заранее часть подфазы 9A: только чистые функции и данные, без таблиц, pg-boss, Resend, API и UI.
Агент: `glm`, ветка `glm/notify-lib`, папка `C:\Users\Admin\Documents\Integetion jobs notify`, решения D100–D104. Миграций нет.

Твой скоринг 6A-score принят и влит в `master` — спасибо. Одно замечание на будущее (не переделывай сейчас): вакансия прикрепляется к результату через модульный `WeakMap` в `score/explain.ts`; связь неявная, в 6A лучше передавать снимок вакансии явно. Старые папки `Integetion jobs score` и `4A-lib` больше не используй: создай новый worktree от свежего `origin/master`.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и действуй по ним. Зависимостей нет.

Прочитай в `docs/TZ_INTGETION_v6.md`: 15 целиком, 4.1 (`notifications`, `notification_preferences`), 10.6, 12.6, 17 (retention уведомлений), 22 (строки 9A, 9B); решения D6, D23 и свои D65–D69, D90–D94 в `docs/DECISIONS.md`.

## Что сделать (`src/modules/notifications/`)

1. **Каталог событий раздела 15** как данные: все 11 типов, для каждого — кому (роль получателя), каналы `inapp`/`email`, значение email по умолчанию, политика отправки (`immediate`, `hourly_batch` для `application.created`, `daily_digest` для `matches.digest`). Тип события и его `payload` — zod-схемы; в payload только id и короткие поля, никаких контактов и email (D16, D23).
2. **Решение об отправке** — `resolveDelivery(type, channel, preferences)`: настройки пользователя (строки `notification_preferences`) переопределяют значения по умолчанию; нет строки — значение по умолчанию из каталога; `inapp` по умолчанию включён у всех типов. Auth-письма (подтверждение, magic link, сброс) — не часть каталога и не отключаются; отрази это в типах, а не комментарием.
3. **Батчинг** — `groupHourlyBatch(events, now)`: события `application.created` для одного получателя за текущий час сводятся в одно письмо (сколько откликов, по каким вакансиям); граница часа — по UTC, обоснуй в D100.
4. **Дайджест** — `nextDigestAt(timeZone, lastSentAt, now)`: не чаще раза в сутки, «утро по tz» (выбери час, например 08:00 местного, и обоснуй в D101) через `localToUtc` из `src/lib/tz.ts`; переходы DST учитываются. И `shouldSendDigest(...)` с порогом score ≥ 0.65 из 22/9B (score приходит параметром).
5. **Ссылка отписки** — `signUnsubscribe({ userId, type, expiresAt }, secret)` / `verifyUnsubscribe(token, secret, now)`: HMAC-SHA256, base64url, сравнение за постоянное время, срок жизни, неверная подпись или просрочка → отказ. Секрет — параметром (переменную окружения подключат в 9A).
6. **Контент писем как ключи i18n**: для каждого типа — ключи темы и тела с параметрами под ключом верхнего уровня `notifications` в `src/messages/en.json` и `ru.json` (только этот ключ, файл не переформатировать). Сами шаблоны React Email и отправка — в 9A.
7. Публичное — через `src/modules/notifications/service/index.ts`.

## Правила

- Меняешь только: `src/modules/notifications/**`, `src/messages/{en,ru}.json` (только ключ `notifications`), `docs/DECISIONS.md` (D100–D104, в конец), `MISSION_LOG.md` (своя запись в конец). Новых npm-зависимостей нет.
- Сборка: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-glm' pnpm build`.

## Тесты (unit, vitest)

- Каталог: ровно 11 типов из раздела 15, значения email по умолчанию совпадают с таблицей; payload-схемы отклоняют email и телефоны.
- `resolveDelivery`: умолчания, явное включение и выключение, `inapp` по умолчанию.
- Батч: несколько откликов в одном часе → одно письмо; граница часа; разные получатели не смешиваются.
- Дайджест: не чаще раза в сутки; утро в Europe/Berlin, America/New_York, Asia/Kolkata, Australia/Lord_Howe; день перехода DST; score 0.64 и 0.65.
- Отписка: валидный токен, подмена любого поля, просрочка на 1 мс, чужой секрет.
- en и ru: одинаковые ключи (уже проверяет `src/messages/messages.test.ts`).

Отчёт по шаблону раздела 0 ТЗ (код подфазы — `9A-lib`), с выводом команд, ссылкой на зелёный CI ветки `glm/notify-lib` и выводом `git log --oneline origin/master..origin/glm/notify-lib`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
