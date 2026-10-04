# Тексты: FAQ главной и страница «Для работодателей» (черновик, D204)

Черновик Claude Code для основателя — править свободно. После согласования тексты переносятся в `src/messages/{ru,en}.json` (ключи `faq` и `forEmployers`) и в разметку `FAQPage`. Факты сверены с ТЗ: подбор (раздел 10), раскрытие контактов (D3), верификация (14.1–14.2), приватность (17). Обещаний сверх MVP нет.

## 1. FAQ на главной (`faq`)

**1. Как работает подбор вакансий? / How does matching work?**

- RU: Вы заполняете профиль — навыки, опыт, языки, ожидания по зарплате и рабочие часы. Мы сравниваем его с каждой вакансией и показываем только те, что подходят хотя бы на 55 %. Под каждой вакансией видно, почему она подходит: совпали навыки, зарплата в ваших ожиданиях, рабочие часы пересекаются.
- EN: You fill in your profile — skills, experience, languages, salary expectations and working hours. We compare it with every job and show only the ones that fit at least 55%. Each match explains why it fits: matching skills, salary within your range, overlapping working hours.

**2. Это бесплатно? / Is it free?**

- RU: Да. Для кандидатов сервис бесплатный, для работодателей публикация вакансий сейчас тоже бесплатна.
- EN: Yes. It is free for candidates, and posting jobs is currently free for employers too.

**3. Кто видит мои контакты? / Who can see my contacts?**

- RU: Никто, пока вы сами не откликнулись и работодатель не проявил интерес к вашему отклику. Только после этого он увидит email и телефон, и каждый такой просмотр записывается. До этого работодатель видит профиль без контактов.
- EN: No one, until you apply and the employer shows interest in your application. Only then can they see your email and phone, and every such view is logged. Before that, employers see your profile without contacts.

**4. Почему для меня важен часовой пояс? / Why does my time zone matter?**

- RU: Удалённая работа — это всё равно созвоны и общие часы. Мы считаем, сколько часов ваш рабочий день реально пересекается с командой, с учётом перехода на летнее время, и не показываем вакансии, где пересечение меньше требуемого.
- EN: Remote work still means calls and shared hours. We calculate how many hours your working day actually overlaps with the team's, including daylight saving changes, and skip jobs where the overlap is below what they require.

**5. Что такое Web3-вакансии и нужен ли опыт в крипте? / What are Web3 jobs and do I need crypto experience?**

- RU: Это работа в компаниях, которые строят продукты на блокчейне: биржи, DeFi, кошельки, NFT, инфраструктура. Многие роли не технические — маркетинг, комьюнити, юристы, поддержка. Отметьте интерес к сфере Web3 в профиле, и мы будем чаще показывать такие вакансии.
- EN: These are jobs at companies building on blockchain: exchanges, DeFi, wallets, NFT, infrastructure. Many roles are non-technical — marketing, community, legal, support. Mark Web3 as an interest in your profile and we will show such jobs more often.

**6. Можно ли найти работу без опыта? / Can I find a job without experience?**

- RU: Да. Ищите метки «Стажировка», «Начальный уровень» и «Подходит джунам» — в каталоге для них есть отдельные кнопки.
- EN: Yes. Look for the Internship, Entry level and Junior-friendly labels — the catalog has quick buttons for them.

**7. Как вы проверяете работодателей? / How do you check employers?**

- RU: У каждой компании есть статус. «Проверена» — подтвердила корпоративную почту или домен и реквизиты. «Надёжная» — давно на платформе, без жалоб и с откликами кандидатам. Вакансии новых компаний и подозрительные объявления проходят ручную модерацию, а на любую вакансию можно пожаловаться.
- EN: Every company has a status. "Verified" means it confirmed a corporate email or domain and its business details. "Trusted" means it has been here a while, has no complaints and responds to candidates. Jobs from new companies and suspicious posts go through manual review, and you can report any job.

## 2. Страница «Для работодателей» (`forEmployers`)

**Герой**

- RU: H1 «Найдите удалённых специалистов, которым подходит ваш часовой пояс». Подзаголовок: «Публикуйте вакансии бесплатно. Мы показываем их кандидатам, у которых совпадают навыки, ожидания по зарплате и рабочие часы». Кнопка «Разместить вакансию».
- EN: H1 "Hire remote people who fit your time zone". Subtitle: "Post jobs for free. We show them to candidates whose skills, salary expectations and working hours match". Button "Post a job".

**Как это работает (4 шага)**

1. RU: Создайте компанию и подтвердите её — почтой на корпоративном домене или записью в DNS. / EN: Create your company and verify it with a corporate email or a DNS record.
2. RU: Опишите вакансию: навыки, вилку, формат, требуемое пересечение часов, сферу. / EN: Describe the job: skills, salary range, format, required hour overlap, sector.
3. RU: Мы покажем её подходящим кандидатам и объясним им, почему она подходит. / EN: We show it to matching candidates and tell them why it fits.
4. RU: Просматривайте отклики, отмечайте интересных — и только тогда открываются их контакты. / EN: Review applications, mark the ones you like — that is when their contacts open.

**Почему у нас (4 тезиса)**

- RU: Подбор по навыкам и часовому поясу, а не по ключевым словам. / EN: Matching by skills and time zone, not keywords.
- RU: Кандидаты видят вилку с учётом валюты и налогов (gross/net) — меньше откликов «мимо». / EN: Candidates see your range with currency and gross/net taken into account — fewer off-target applications.
- RU: Web3 и классическая удалённая работа в одном месте, на русском и английском. / EN: Web3 and regular remote work in one place, in English and Russian.
- RU: Бейдж проверенной компании повышает доверие и отклик. / EN: A verified badge builds trust and gets more replies.

**Верификация**

- RU: «Без проверки» — вакансии проходят модерацию, есть лимит публикаций в сутки. «Проверена» — корпоративная почта или DNS + реквизиты, больше лимит, бейдж. «Надёжная» — присваивается автоматически при стабильной работе без жалоб.
- EN: "Unverified" — jobs are moderated and there is a daily posting limit. "Verified" — corporate email or DNS plus business details, a higher limit and a badge. "Trusted" — granted automatically after steady activity without complaints.

**FAQ работодателя**

1. RU: Сколько стоит? — Сейчас бесплатно. / EN: How much does it cost? — It is free for now.
2. RU: Сколько вакансий можно опубликовать? — Без проверки — 5 в сутки, после проверки — 50. / EN: How many jobs can I post? — 5 per day unverified, 50 once verified.
3. RU: Почему вакансия на модерации? — Компания ещё не проверена или объявление похоже на рискованное; обычно проверка занимает до суток. / EN: Why is my job under review? — The company is not verified yet or the post looks risky; review usually takes up to a day. (OPEN QUESTION: реальный срок модерации.)
4. RU: Когда я увижу контакты кандидата? — После того как отметите его отклик как интересный: он попадает в шорт-лист, и контакты открываются. / EN: When do I see a candidate's contacts? — After you mark the application as interesting: it moves to the shortlist and the contacts open.
5. RU: Можно ли не указывать зарплату? — Можно, но такие вакансии кандидаты видят ниже в подборе. / EN: Can I leave the salary out? — Yes, but such jobs rank lower in candidates' matches.

**Финальный CTA**

- RU: «Готовы нанимать? Разместите первую вакансию — это займёт 5 минут». Кнопка «Разместить вакансию».
- EN: "Ready to hire? Post your first job — it takes 5 minutes". Button "Post a job".
