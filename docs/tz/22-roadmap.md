# Roadmap подфаз

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

> Параллельная работа: [../PARALLEL_WORK.md](../PARALLEL_WORK.md).

## 22. ROADMAP — ПОДФАЗЫ (порядок сессий — D33; выполнять строго по порядку)

| Код | Цель | Зависит от | Вне скоупа | Проверка (DoD подфазы) | Риск |
|-----|------|------------|------------|------------------------|------|
| 0A | Repo: Next.js + TS strict, pnpm, ESLint (+ import-правила, jsx-a11y), Prettier, vitest, Playwright-каркас, CI (lint/typecheck/test/build/gitleaks), `.env.example`, структура 3.3, `MISSION_LOG.md`, `.cursor/rules/spec.mdc` | — | фичи | CI зелёный; `pnpm lint typecheck test build` = 0 | — |
| 0B | Локальный Supabase, Drizzle, миграция №1 (enum-типы, `users`), роли `app_rw`, RLS deny-all шаблон, `docs/ERD.md`, `docs/DECISIONS.md` (D1–D30), `src/lib/http` (ошибки, 404/403-конвенция), `/api/health` | 0A | фичи | миграция с нуля в CI; ERD = раздел 4 | — |
| 0C | UI-оболочка: next-intl (en/ru, префикс), layout, шапка/футер, тема, главная (статичные блоки), 404/500, lint-запрет хардкод-строк | 0B | данные | axe без критичных; LCP главной < 2.5 s (Lighthouse) | — |
| 1A | Supabase Auth: пароль + magic link, `/auth/callback` → `users`, terms, middleware сессии, `/login /register /reset-password`, `/api/me` | 0C | роли | e2e обоих способов; email не подтверждён → write запрещён | — |
| 1B | Guards (requireUser/Candidate/Membership/Admin), `audit_logs`, `rate_limit_counters` + лимиты auth, CSRF-проверка Origin, заголовки безопасности/CSP | 1A | UI | unit guards; P12, P15 (auth) | — |
| 2A | `skills`, `skills_aliases`, `skill_suggestions`, bootstrap 80–120 навыков (en/ru), `normalizeSkill()` | 0B | LLM-маппинг | `'React.js'`,`'ReactJS'` → `react`; неизвестное → suggestions | грязные алиасы |
| 2B | Профиль кандидата: таблицы 4.1, `candidate_contacts` + `contactsService`, формы `/profile/edit`, полнота (11.3), timezone из браузера, i18n | 2A, 1B | бот | unit полноты; P1 | — |
| 3A | `companies`, `company_members`, `employer_profiles`, `/onboarding`, `/employer/company`, логотип, проверка дублей | 1B | инвайты, верификация | тест membership; P2-заготовка; импорт-компанию нельзя редактировать | — |
| 3B | Jobs CRUD (internal), `job_skills`, `job_languages`, `job_status_history`, publish (D12), risk-score v1, `/employer/jobs*`, cron expire | 3A, 2A | фильтры | переходы 4.3; P2 | — |
| 4A | `/jobs`, `/jobs/[id]`, фильтры (tz-overlap, зарплата по D4/D5), FTS, курсорная пагинация, seed 5k, `/companies/[slug]`, главная с живыми данными, `fx_rates` + cron | 3B | matching | perf p95 < 500 ms; unit фильтров | производительность FTS |
| 4B | Save/Hide/hide_company/report + `user_job_feedback`, `/saved-jobs` | 4A | loop | hidden исчез из листинга; P-лимиты reports | — |
| 5A | Applications: apply (D15, D27), `transitionApplication`, history, withdraw, `/applications` | 3B, 2B | интерес | P9; таблица переходов; повтор → 409 | — |
| 5B | Пайплайн работодателя: список откликов, просмотр профиля (D24), auto-viewed, rejected, interview/offer/hired (без shortlisted) | 5A | reveal | P3, P5 | преждевременный reveal |
| 5C | Express interest: shortlisted + reveal в одной транзакции, `/contacts`, D23, аудит чтений | 5B | чат | P4, P14, P16 (contacts); тест атомарности | «забытые» контакты |
| 6A | Matching v1: hard-фильтры, компоненты, штрафы, explain, `matching_results`, tz-алгоритм 10.6 | 4B, 2B | эмбеддинги | кейсы нейтральной зарплаты, gross/net, DST, полночь | DST-ошибки |
| 6B | Feedback loop (10.5), `/api/matches`, `/matches`, «почему подходит» на странице вакансии, пересчёт при публикации (pg-boss) | 6A | ML | dismissed понижает категорию; hidden_company исключает | — |
| 7A | Бот-каркас: `LLMProvider`, SSE-чат `/chat`, conversations, ConversationManager, tool layer + permissions, подтверждения, бюджеты, редакция PII | 6B, 5A | сценарии | P8, P11; лимиты работают; circuit breaker | утечка полей |
| 7B | Сценарии: onboarding-экстракция, карточка профиля, показ вакансий, apply с подтверждением, привязка гостя, golden evals (20) + adversarial (15) | 7A | telegram, работодатель | P10; evals ≥ порогов | injection |
| 8A | Импорт на фикстурах: адаптеры, нормализация, дедуп, external apply (D8), автомодерация, `import_runs`, expire | 3B, 2A | живой источник | P6; дедуп-кейс; scam отклонён | дубли |
| 8B | Живой источник (только при founder approval в MISSION_LOG; иначе BLOCKED) | 8A | скрейпинг | e2e на 20 записях, дублей 0 | доступность API |
| 9A | Notifications: in-app + email, preferences, события раздела 15, батчинг, отписка | 5C | проактив бота | preferences уважаются; шаблоны en/ru | — |
| 9B | Проактивность: дайджест совпадений (cron по tz), `system_event` в чате | 9A, 6B, 7A | Telegram | ≤ 1 дайджест/сутки; score ≥ 0.65 | спам |
| 10A | Admin: списки, moderation_queue, reports + авто-пауза, блокировки, таксономия, импорт-панель, audit | 3B | — | P7, P16 | — |
| 10B | Верификация: corporate email / DNS TXT, реквизиты, risk-флаги 14.3, trusted-cron, бейджи | 10A | авто-Trusted без критериев | free-email + mass → pending; trusted по критериям | — |
| 10C | Приватность: экспорт, удаление/анонимизация, retention-cron, `/settings/privacy` | 9A | — | P13; retention-тест | — |
| 11A | Hardening: ревизия rate limits, CSP, security-ревизия по разделу 16, нагрузочный тест, LLM security review | все | фичи | P1–P16 все зелёные; perf-бюджеты | — |
| 11B | Launch: Sentry, алерты 18.1, `/admin/metrics`, бэкапы + restore-тест, RUNBOOK, prod seed | 11A | фичи | алерты срабатывают на тестовом событии; restore успешен | — |

Примечания:
- 5B намеренно не включает shortlisted: он появляется только в 5C вместе с
  reveal (D3).
- Бот (7A/7B) идёт после откликов (5A), потому что `apply_to_job`
  использует сервис откликов.
- Нумерация отличается от v5 — действует нумерация v6.

---
