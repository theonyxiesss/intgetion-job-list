Ты — Antigravity. Задача: безопасный LLM-слой и набор evals для бота проекта INTGETION JOB LIST. Это выделенная заранее часть подфаз 7A/7B: только чистый код и данные, без базы, API, UI и без сетевых вызовов к LLM.
Агент: `antigravity`, ветка `antigravity/llm-lib`, папка `C:\Users\Admin\Documents\Integetion jobs llm`, решения D85–D89. Миграций нет.

Сначала прочитай `docs/prompts/_common.md` и `docs/PARALLEL_WORK.md` из `origin/master` (клон: https://github.com/theonyxiesss/intgetion-job-list) и действуй по ним: свой worktree, план, DoD, отчёт, в `master` не пушить. Зависимостей нет — можно начинать сразу. Папку `Integetion jobs review` для этой задачи не используй — она только для ревью.

Прочитай в `docs/TZ_INTGETION_v6.md`: 12 целиком (особенно 12.1, 12.3, 12.4, 12.5), 16.2, 19.3; решения D11, D14, D17, D29, D30 в `docs/DECISIONS.md`; каталог навыков `src/db/seed/skills.ts` и `src/modules/taxonomy/service/index.ts` (слаги навыков для evals).

## Что сделать

### `src/lib/llm/` (чистый TypeScript)

1. `provider.ts` — интерфейс `LLMProvider` (D29): сообщения, tool calls, structured output по zod-схеме, `usage { tokensIn, tokensOut }`, модель из env (`LLM_MODEL_CHAT`, `LLM_MODEL_EXTRACT`). Реальный адаптер Anthropic **не делай** (ключа нет, это 7A); сделай `FakeLLMProvider` со сценарием ответов для тестов. Ответ structured output всегда валидируется zod-схемой; невалидный → ошибка, не «как есть».
2. `untrusted.ts` — `wrapUntrusted(source, text)` по 12.4: `<untrusted_data source="job:123">…</untrusted_data>`, экранирование так, чтобы текст не мог закрыть тег или открыть новый, обрезка до 2000 символов на объект, `source` — только из allowlist форматов (`job:<id>`, `company:<id>`, `user_message`).
3. `redact.ts` — редакция PII в тексте пользователя перед LLM: email → `[email]`, телефоны → `[phone]`, URL → `[link]` (12.4); и `pickLlmFields(...)` — allowlist полей профиля и вакансии на вход LLM (12.4, D17): всё, чего нет в allowlist, отбрасывается; контакты, email, телефоны, ссылки на профили — никогда.
4. `budget.ts` — по 12.5: стоимость в micro-USD из токенов и таблицы цен, которая передаётся параметром (цены не зашивать); лимит 800 токенов на ответ; обрезка контекста до 6000 входных токенов и истории до 12 сообщений + summary (оценку токенов опиши и обоснуй в D85, без внешних токенизаторов); решение circuit breaker (суточная стоимость > `LLM_DAILY_BUDGET_USD` → отказ); аномалия (> 3× медианы суточной стоимости пользователя → флаг). Деньги здесь — целые micro-USD (`bigint` или целые `number` до 2^53 с проверкой), без float.

### `evals/` (данные по 19.3)

- `evals/onboarding/*.json` — 20 golden-диалогов на en и ru (примерно поровну): реплики пользователя → ожидаемый профиль (навыки только слагами из каталога 2A, числа, IANA-таймзона, формат работы, зарплатная вилка по D19). Данные выдуманные; в текстах попадаются email/телефоны/ссылки, чтобы проверять редакцию.
- `evals/adversarial/*.json` — не меньше 15 кейсов из 19.3: инструкции внутри описания вакансии, просьба показать чужие контакты, «ты админ», попытка apply без подтверждения, утечка system prompt, PII в тексте пользователя. У каждого — ожидаемое поведение (что бот должен и не должен сделать).
- `evals/schema.ts` — zod-схемы обоих форматов.
- Раннер `pnpm eval` и прогон через LLM **не делай** — это 7B.

## Правила

- Меняешь только: `src/lib/llm/**`, `evals/**` (можно удалить `evals/.gitkeep`), их тесты, `docs/DECISIONS.md` (D85–D89, в конец), `MISSION_LOG.md` (своя запись в конец). Больше ничего: `package.json`, `src/messages/*`, `src/modules/**` не трогай. Новых npm-зависимостей нет (zod уже есть).
- Сборка локально: `SWC_NATIVE_BINDING_CACHE='C:\Users\Admin\.swc-cache-antigravity' pnpm build` (папку создай заранее).
- Vitest ищет тесты по `src/**/*.test.ts`. Тест, который проверяет файлы `evals/`, положи в `src/lib/llm/evals.test.ts`.

## Тесты (unit, vitest)

- `wrapUntrusted`: попытки закрыть тег, вложенные теги, кавычки в `source`, обрезка на границе, неверный `source` → ошибка.
- `redact`: email в разных формах, телефоны (+7, +1, с пробелами и скобками), URL с http/https/www и без схемы; текст без PII не меняется; навыки вроде `C#`, `Node.js`, `ASP.NET` **не** принимаются за ссылки или телефоны.
- `pickLlmFields`: лишние и запрещённые поля отбрасываются, включая вложенные.
- `budget`: стоимость, лимиты, обрезка истории, circuit breaker на границе бюджета, аномалия.
- `FakeLLMProvider` + structured output: невалидный ответ отклоняется.
- evals: все файлы проходят zod-схему; каждый слаг навыка есть в каталоге 2A; каждая таймзона валидна через `Intl`; golden ровно 20, adversarial не меньше 15; покрыты все 6 типов атак из 19.3.

Отчёт по шаблону раздела 0 ТЗ (код подфазы — `7-lib`), с выводом команд, ссылкой на зелёный CI ветки `antigravity/llm-lib`, решениями D85+ и выводом `git log --oneline origin/master..origin/antigravity/llm-lib`. Не пиши «готово», пока коммиты не запушены и CI ветки не зелёный.
