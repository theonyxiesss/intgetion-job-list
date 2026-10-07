# Уведомления

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

## 15. УВЕДОМЛЕНИЯ

| type | Кому | inapp | email по умолчанию |
|------|------|-------|--------------------|
| application.created | members компании (recruiter+) | ✅ | ✅ (батч раз в час) |
| application.viewed | кандидат | ✅ | — |
| application.status_changed | кандидат | ✅ | ✅ |
| application.withdrawn | members | ✅ | — |
| mutual_interest.revealed | кандидат + members | ✅ | ✅ |
| job.moderation_decided | создатель вакансии | ✅ | ✅ |
| job.expiring (за 3 дня) | создатель | ✅ | ✅ |
| job.closed (на которую откликнулся) | кандидат | ✅ | — |
| company.verification_decided | owner | ✅ | ✅ |
| matches.digest | кандидат | ✅ | ✅ (≤ 1/сутки, утро по tz) |
| report.decided | жалобщик | ✅ | — |

- Отправка через pg-boss; email — Resend, шаблоны React Email на языке
  получателя; ссылка отписки в каждом письме (кроме транзакционных
  auth-писем).
- `notification_preferences` уважаются (тест). Auth-письма отключить нельзя.

---
