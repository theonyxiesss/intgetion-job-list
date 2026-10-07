# Безопасность

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

## 16. БЕЗОПАСНОСТЬ

### 16.1 Классический периметр
- **AuthN:** Supabase Auth, подтверждение email обязательно до любых write;
  access token 1 ч, refresh rotation включён, revoke при смене пароля и
  удалении.
- **AuthZ:** раздел 5; IDOR-тесты обязательны.
- **Пароли:** только Supabase (bcrypt на их стороне); ≥ 10 символов, блок-лист.
- **CSRF:** SameSite=Lax + проверка Origin на мутирующих запросах.
- **XSS:** React-экранирование; Markdown через `rehype-sanitize`
  (allowlist тегов); `dangerouslySetInnerHTML` запрещён (lint).
- **CSP:** `default-src 'self'; script-src 'self' 'nonce-…'; img-src 'self' data: <supabase-storage>; connect-src 'self' <supabase> <sentry>; frame-ancestors 'none'`; плюс HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- **SQL injection:** только Drizzle / `sql` tagged template; конкатенация
  SQL запрещена (lint-правило/grep в CI).
- **Rate limiting/brute force:** раздел 6.
- **Спам и злоупотребления:** порог полноты для отклика, лимит 30 откликов/сутки,
  лимиты вакансий, risk-скоринг.
- **Загрузка файлов:** только логотипы (MVP); MIME по сигнатуре, ≤ 2 MB,
  перекодировка, случайные имена. CV (V2): приватный bucket, антивирус,
  pdf/docx ≤ 5 MB, подписанные URL.
- **БД:** роль `app_rw` (DML без DDL), миграции — отдельной ролью; service
  role — только для Auth admin API на сервере.
- **Секреты:** env, gitleaks в CI, ротация при утечке (RUNBOOK).
- **Шифрование:** TLS везде; at rest — Supabase (диск). Колонки
  `candidate_contacts` дополнительно — OPEN QUESTION (pgsodium), не блокирует MVP.
- **Аудит:** `audit_logs` для: действий админа, чтения контактов, reveal,
  смены статуса компании, удаления аккаунта, входов админа.

### 16.2 LLM security
- Indirect prompt injection: все UGC — untrusted (12.4); LLM не может
  инициировать write без подтверждения; tool-слой проверяет права заново.
- PII: allowlist + редакция (12.4); логи без PII; провайдер — с DPA и
  отключённым обучением на данных (OPEN QUESTION — подтвердить условия).
- Ответы LLM, отображаемые в UI, рендерятся как текст/безопасный Markdown
  (без HTML, ссылки только на домен платформы и URL вакансий из БД).
- Набор adversarial-кейсов ≥ 15 (раздел 19.3).

---
