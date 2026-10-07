# Страницы и UX

> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).
> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).

## 8. КАРТА СТРАНИЦ (все под `/[locale]`)

| Route | Доступ | Назначение / ключевые компоненты | API |
|-------|--------|----------------------------------|-----|
| `/` | все | Hero, поиск, CTA, категории, последние вакансии, преимущества | jobs |
| `/jobs` | все | Фильтры (формат, tz-overlap, вилка, навыки, категория, источник), список карточек, пагинация | jobs |
| `/jobs/[id]` | все | Детальная, Apply/Save/Hide/Report, «почему подходит» (если залогинен) | jobs, matches |
| `/companies/[slug]` | все | Профиль компании, бейджи, вакансии | companies |
| `/chat` | все | Веб-чат бота (SSE), карточки подтверждения | bot |
| `/login`, `/register`, `/reset-password`, `/auth/callback`, `/auth/check-email` | гость | Auth | auth |
| `/onboarding` | user | Выбор: «Ищу работу» (→ чат или форма) / «Нанимаю» (→ компания) | me |
| `/matches` | кандидат | Рекомендации с explain, dismiss | matches |
| `/profile`, `/profile/edit` | кандидат | Профиль, полнота (прогресс-бар + что добавить), контакты | candidates |
| `/applications` | кандидат | Отклики по статусам, withdraw | applications |
| `/saved-jobs` | кандидат | Сохранённые | jobs |
| `/notifications` | user | Лента | notifications |
| `/settings`, `/settings/notifications`, `/settings/privacy`, `/settings/account` | user | Язык, уведомления, скрытие профиля, экспорт, удаление | me |
| `/employer` | member | Дашборд: вакансии, новые отклики | — |
| `/employer/company`, `/employer/company/verify` | member / owner | Профиль компании, верификация | companies |
| `/employer/jobs`, `/employer/jobs/new`, `/employer/jobs/[id]`, `/employer/jobs/[id]/edit` | member | CRUD, статусы | jobs |
| `/employer/jobs/[id]/applications`, `/employer/applications/[id]` | member | Пайплайн откликов, профиль кандидата, express interest, контакты | applications |
| `/employer/settings` | member | Уведомления работодателя | — |
| `/admin`, `/admin/moderation`, `/admin/reports`, `/admin/users`, `/admin/companies`, `/admin/jobs`, `/admin/taxonomy`, `/admin/import`, `/admin/metrics`, `/admin/audit` | admin (иначе 404) | Модерация и управление | admin |
| `/legal/terms`, `/legal/privacy` | все | Юр. страницы (тексты — OPEN QUESTION) | — |
| `not-found`, `error` | все | 404/500 с i18n | — |

**Не создавать в MVP:** `/messages` (V2), `/employer/candidates` (V3).

---

## 9. UX / UI

### 9.1 Главная
```
INTGETION JOB LIST
Remote work. Real matches.
Find work. Find people. Connect directly.
[Find a Remote Job]   [Post a Job]
```
RU-строки — в `ru.json` (перевод, название не переводится). Ниже: строка
поиска, 8 категорий, 10 последних вакансий, 3 преимущества (бот-агент,
совпадения с объяснениями, контакты только по взаимному интересу). Без
каруселей, видео и тяжёлых анимаций.

### 9.2 Карточка вакансии (список) / страница вакансии
Обязательные поля: title; компания + бейдж (`verified`, `trusted`, или
«импортировано из <source>»); формат (remote по умолчанию, иконка);
ограничения по странам («весь мир» / список); требования к tz
(«пересечение ≥ 3 ч с Europe/Berlin»); зарплата (вилка, валюта, период,
gross/net, или «не указана»); тип занятости; опыт; навыки (до 6 + «ещё N»);
языки; дата публикации (относительная); источник; способ отклика.
Кнопки: **Apply** (primary; для imported — «Откликнуться на сайте
источника ↗»), **Save**, **Hide** (меню: «не интересна: зарплата / формат /
таймзона / компания / роль»), Report.
Для залогиненного кандидата — блок «Почему подходит» из `explain`.

### 9.3 Профиль кандидата
Прогресс-бар полноты с конкретными подсказками («Добавьте ещё 2 навыка
(+10%)»). Контакты — отдельный блок с пояснением «видны компании только после
её интереса к вашему отклику». Timezone по умолчанию — из
`Intl.DateTimeFormat().resolvedOptions().timeZone`, с подтверждением.

### 9.4 Доступность и качество
- WCAG 2.1 AA: контраст ≥ 4.5:1, видимый фокус, вся навигация с клавиатуры,
  `aria-live="polite"` для потока сообщений бота, подписи у всех полей,
  ошибки форм связаны `aria-describedby`.
- Mobile-first, брейкпоинты Tailwind; цели касания ≥ 44 px.
- Тема светлая/тёмная (prefers-color-scheme).
- eslint-plugin-jsx-a11y в CI; axe-проверка в Playwright для 6 ключевых страниц.

---
