# Приватность / GDPR / retention

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

## 17. ПРИВАТНОСТЬ / GDPR / RETENTION
- Согласие: чекбокс условий и политики при регистрации (`terms_version`);
  маркетинг — отдельный opt-in, по умолчанию выключен. Cookie-баннер — только
  если появятся неnecessary cookies (в MVP аналитика без cookies).
- Экспорт: `GET /api/me/export` — JSON (профиль, навыки, опыт, языки,
  контакты, отклики, сохранённые, уведомления, сообщения бота).
- Удаление (D28): статус `deleted`; ФИО → «Deleted user»; `candidate_contacts`,
  `employer_profiles`, `bot_messages`, `saved_jobs`, `notifications` —
  удаляются; `applications` остаются с анонимным кандидатом, контакты
  недоступны (D23); Supabase auth-пользователь удаляется; компании, где
  пользователь единственный owner, — `suspended`, вакансии `closed`.
- Retention (cron ежесуточно):

| Данные | Срок |
|--------|------|
| bot_messages | 180 дней |
| гостевые bot_conversations без привязки | 30 дней |
| notifications | 90 дней (прочитанные) |
| user_job_feedback | 365 дней |
| audit_logs | 365 дней |
| matching_results | пересчитываемые, удалять старше 30 дней |
| rate_limit_counters | 48 часов |
| import_runs | 180 дней |

---
