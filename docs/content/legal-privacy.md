<!--
Политика конфиденциальности (версия текста 2026-10-05). Источник для
страницы /{locale}/privacy: после правки запустить `pnpm legal:sync`.
Значения в двойных фигурных скобках подставляются из src/config/legal.ts;
пока они не заданы, на сайте показывается «уточняется». Текст описывает то,
что сервис реально делает на 2026-10-05; при новых функциях — обновлять.
Перед окончательной публикацией — проверка юристом.
-->

# Политика конфиденциальности

Редакция от {{effectiveDate}}. Версия {{version}}.

## 1. Кратко

- Мы собираем то, что нужно для поиска работы и найма, и не продаём данные.
- Контакты кандидата видит только работодатель, к которому у кандидата взаимный интерес.
- Статистику посещений считаем сами, без Google Analytics и других сторонних сервисов; кука аналитики ставится только с вашего согласия, сигнал Global Privacy Control соблюдается.
- Вы можете в любой момент скачать свои данные, изменить их, отказаться от необязательных кук и удалить аккаунт — в «Настройках».

## 2. Кто отвечает за данные

Оператор (контролёр) данных — {{operator}}, {{address}}. Вопросы о данных: {{privacyEmail}}.

## 3. Какие данные мы собираем

### 3.1 Аккаунт

- Почта и пароль (пароль хранится только в виде хеша у нашего провайдера аутентификации, мы его не видим) или данные Telegram при входе через Telegram: числовой id, имя и ник. Номер телефона Telegram мы не получаем.
- Язык интерфейса, дата принятия условий и их версия, подписка на новости (по умолчанию выключена).
- Служебные записи о входах: время, страна и тип устройства.

### 3.2 Профиль кандидата

Имя, заголовок, желаемые должности, навыки и их уровни, опыт, языки, часовой пояс и рабочие часы, формат и тип занятости, зарплатные ожидания, отраслевые предпочтения, видимость профиля. Контакты (почта, телефон, Telegram, LinkedIn, сайт) хранятся отдельно и открываются работодателю только при взаимном интересе.

### 3.3 Работодатели и компании

Имя и должность представителя, данные компании (название, описание, сайт, логотип, домен для проверки), участники компании, вакансии, история проверки компании.

### 3.4 Действия на сервисе

Отклики и их статусы, сохранённые и скрытые вакансии, жалобы, сохранённые поиски, компании, за которыми вы следите, оценки совпадения с вакансиями, уведомления и их доставка, настройки уведомлений.

### 3.5 Карьерный агент (ИИ)

Сообщения в чате с агентом и черновики изменений профиля. Перед отправкой модели из текста удаляются почты, телефоны и похожие на документы номера. Гостевые беседы привязаны к случайному идентификатору в куке, а не к человеку.

Память агента: короткие факты о вас и ваших целях, которые вы сами попросили запомнить или добавили в «Настройках → Приватность → Память Spoki». Агент читает их в каждой беседе, чтобы не переспрашивать. Контакты, ссылки, пароли и ключи в память не принимаются. Каждый факт можно исправить или стереть, а также стереть всю память сразу.

### 3.6 Согласия

Журнал выбора кук: какие категории разрешены, версия политики, был ли сигнал Global Privacy Control, где сделан выбор и хеш IP-адреса. Это нужно, чтобы доказать, что согласие было дано.

### 3.7 Статистика посещений

- Для всех посетителей, без кук: адрес страницы без параметров, тип события (просмотр, открытие вакансии, поиск, регистрация, отклик), текст поискового запроса (до 60 символов), сайт, с которого вы пришли, метки рекламных кампаний, класс устройства (телефон, планшет, компьютер). Уникальные посетители за день считаются по ключу, который вычисляется из даты, IP-адреса и браузера с секретом сервера; сам IP и строка браузера не сохраняются, а ключ нельзя развернуть и связать с другим днём.
- Только с согласием на аналитику: случайный идентификатор браузера в куке «_ia», чтобы видеть повторные визиты. Он не связан с вашим аккаунтом.

### 3.8 Технические данные

Журналы сервера: время, адрес запроса, код ответа, идентификатор запроса; почты и телефоны в журналах маскируются. IP-адрес используется для защиты от злоупотреблений (лимиты запросов) и хранится только в виде хеша.

## 4. Зачем и на каком основании

| Цель                                                                             | Данные              | Основание (GDPR, ст. 6)                                                  |
| -------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| Аккаунт, вход, профиль, каталог, подбор, отклики, связь кандидата и работодателя | 3.1–3.4             | исполнение договора (Пользовательского соглашения)                       |
| Уведомления о ваших откликах, совпадениях, поисках                               | 3.4                 | исполнение договора; каналы настраиваются                                |
| Карьерный агент                                                                  | 3.5                 | исполнение договора, по вашему запросу                                   |
| Новостные рассылки                                                               | почта, Telegram     | согласие (подписка), отзывается в любой момент                           |
| Модерация, борьба с мошенничеством и спамом, безопасность                        | 3.1–3.4, 3.8        | законный интерес — защитить пользователей и сервис                       |
| Статистика без кук                                                               | 3.7, первая часть   | законный интерес — понимать, как работает сервис, без отслеживания людей |
| Кука аналитики «_ia»                                                             | 3.7, вторая часть   | согласие                                                                 |
| Запоминание фильтров и просмотренных вакансий                                    | куки «предпочтений» | согласие                                                                 |
| Журнал согласий                                                                  | 3.6                 | юридическая обязанность доказать согласие                                |
| Ответы на запросы властей                                                        | по запросу          | юридическая обязанность                                                  |

Автоматическая оценка совпадения (подбор) помогает сортировать вакансии и кандидатов, но не принимает решений, имеющих для вас юридические последствия: решение об отклике и найме принимают люди.

## 5. Куки и похожие технологии

Необходимые куки работают всегда — без них сайт не может работать. Остальные ставятся только после вашего согласия в баннере или в «Настройках → Приватность»; отказаться так же просто, как согласиться, а отзыв согласия удаляет соответствующие куки.

| Кука               | Зачем                                                            | Категория    | Срок                                       |
| ------------------ | ---------------------------------------------------------------- | ------------ | ------------------------------------------ |
| sb-…-auth-token    | вход в аккаунт                                                   | необходимая  | пока активна сессия, обновляется при входе |
| NEXT_LOCALE        | выбранный язык                                                   | необходимая  | до закрытия браузера                       |
| cookie_consent     | ваш выбор кук, версия политики и номер записи в журнале согласий | необходимая  | 1 год                                      |
| bot_session        | беседа с карьерным агентом до входа                              | необходимая  | 30 дней                                    |
| last_catalog_query | последние фильтры каталога                                       | предпочтения | 30 дней                                    |
| recent_jobs        | последние просмотренные вакансии                                 | предпочтения | 30 дней                                    |
| _ia                | случайный идентификатор для повторных визитов                    | аналитика    | 13 месяцев                                 |

Тема оформления (светлая или тёмная) хранится в памяти браузера (localStorage) и никуда не передаётся.

Сторонних кук, рекламных и отслеживающих скриптов на сайте нет. Если браузер передаёт сигнал Global Privacy Control, аналитика остаётся выключенной, что бы ни было выбрано.

## 6. Кому мы передаём данные

### 6.1 Другим пользователям

- Работодателю, на вакансию которого вы откликнулись, — ваш профиль без контактов; контакты — только при взаимном интересе.
- Работодателям в подборе — профиль без контактов, если вы не скрыли его в настройках.
- Подписчикам компании и всем посетителям — опубликованные вакансии и страница компании.
- Работодателю в статистике вакансии — только суммы (просмотры, источники, устройства), без сведений о людях.

### 6.2 Подрядчикам, которые обрабатывают данные по нашему поручению

| Сервис                                                         | Для чего                                                       | Где                              |
| -------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------- |
| Supabase                                                       | база данных, вход, хранение логотипов                          | ЕС (Франкфурт)                   |
| Vercel                                                         | хостинг сайта и запуск задач                                   | глобальная сеть, в том числе США |
| Resend                                                         | отправка писем                                                 | США                              |
| Telegram                                                       | вход через Telegram и уведомления от бота, если вы их включили | по условиям Telegram             |
| Поставщик модели ИИ (OpenRouter или Anthropic — какой включён) | ответы карьерного агента; без почт и телефонов (п. 3.5)        | США                              |
| Sentry (если включён)                                          | отчёты об ошибках сервера, без персональных данных             | ЕС или США                       |

С подрядчиками действуют договоры об обработке данных; при передаче за пределы ЕЭЗ применяются стандартные договорные условия Европейской комиссии или иные законные механизмы. Использование данных поставщиком модели ИИ для обучения: {{aiTraining}}.

### 6.3 Иным лицам

Государственным органам — только по законному требованию. При продаже или реорганизации бизнеса данные могут перейти правопреемнику с сохранением этой политики. Данные не продаются и не передаются для рекламы.

## 7. Сроки хранения

| Данные                                         | Срок                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Аккаунт и профиль                              | пока аккаунт существует; при удалении — сразу обезличиваются (п. 9)  |
| Контакты кандидата                             | до удаления аккаунта или до изменения                                |
| Отклики                                        | пока существует вакансия; после удаления аккаунта — без связи с вами |
| Сообщения карьерному агенту                    | 180 дней                                                             |
| Память агента                                  | пока вы не сотрёте факт или аккаунт                                  |
| Гостевые беседы с агентом                      | 30 дней                                                              |
| Прочитанные уведомления                        | 90 дней                                                              |
| Письма в очереди отправки                      | 90 дней                                                              |
| Скрытые и отмеченные вакансии                  | 365 дней                                                             |
| Оценки совпадения                              | пересчитываются; старше 30 дней удаляются                            |
| Журнал действий администраторов и безопасности | 365 дней                                                             |
| Журнал согласий                                | 3 года                                                               |
| Статистика посещений                           | 395 дней                                                             |
| Счётчики лимитов запросов                      | 48 часов                                                             |
| Журналы сервера                                | до 30 дней                                                           |
| Резервные копии базы                           | по циклу резервного копирования провайдера: {{backupPeriod}}         |

## 8. Как мы защищаем данные

Шифрование соединения (HTTPS, HSTS), шифрование дисков у провайдера, разграничение доступа по ролям, раздельные роли базы данных с запретом на изменение структуры из приложения, строгая политика безопасности содержимого страниц, лимиты запросов, журнал действий администраторов, обязательная двухфакторная аутентификация для администраторов, доступ сотрудников к персональным данным только с указанием причины и записью в журнал. Если произойдёт утечка, которая угрожает вашим правам, мы сообщим вам и надзорному органу в сроки, которых требует закон.

## 9. Ваши права

- **Доступ и перенос**: «Настройки → Приватность → Скачать свои данные» — файл JSON со всеми данными о вас.
- **Исправление**: в профиле и настройках; остальное — по запросу.
- **Удаление**: «Настройки → Приватность → Удалить аккаунт». Профиль обезличивается («Удалённый пользователь»), контакты, сообщения агенту, память агента, сохранённые вакансии и уведомления удаляются, аккаунт входа удаляется; отклики остаются у работодателей без ваших контактов; компании, где вы единственный владелец, приостанавливаются.
- **Отзыв согласия**: куки — в баннере или «Настройках → Приватность»; новости — в настройках уведомлений или по ссылке в письме.
- **Возражение и ограничение** обработки на основании законного интереса — по запросу на {{privacyEmail}}.
- **Жалоба** в надзорный орган по защите данных вашей страны.

Мы отвечаем на запросы в течение месяца. Чтобы защитить вас, можем попросить подтвердить, что запрос отправлен из вашего аккаунта.

## 10. Дети

Сервис не предназначен для лиц младше {{minAge}} лет, и мы сознательно не собираем их данные. Если вы узнали, что такой аккаунт создан, напишите нам — мы удалим его.

## 11. Изменения политики

О существенных изменениях мы сообщаем заранее письмом и уведомлением в сервисе. Если меняются цели обработки, основанные на согласии, мы попросим согласие заново — так же, как баннер кук спрашивает снова после изменения версии политики.

## 12. Контакты

- Вопросы о данных: {{privacyEmail}}
- Общие вопросы: {{supportEmail}}
- Почтовый адрес: {{address}}

<!-- en -->

# Privacy Policy

Version of {{effectiveDate}}. Version id {{version}}.

## 1. In short

- We collect what is needed to find work and hire, and we do not sell data.
- A candidate's contacts are visible only to an employer with mutual interest.
- We count visits ourselves, without Google Analytics or other third parties; the analytics cookie is set only with your consent, and the Global Privacy Control signal is honoured.
- You can download your data, change it, refuse optional cookies and delete your account at any time in Settings.

## 2. Who is responsible

The data controller is {{operator}}, {{address}}. Data questions: {{privacyEmail}}.

## 3. What we collect

### 3.1 Account

- Email and password (only a hash is stored by our authentication provider; we never see it), or Telegram data when you sign in with Telegram: numeric id, name and username. We do not receive your Telegram phone number.
- Interface language, the date and version of the accepted terms, newsletter subscription (off by default).
- Sign-in records: time, country and device type.

### 3.2 Candidate profile

Name, headline, desired titles, skills and levels, experience, languages, time zone and working hours, work format and employment type, salary expectations, sector preferences, profile visibility. Contacts (email, phone, Telegram, LinkedIn, website) are stored separately and shown to an employer only on mutual interest.

### 3.3 Employers and companies

Representative's name and title, company data (name, description, website, logo, verification domain), company members, jobs, verification history.

### 3.4 Activity

Applications and their statuses, saved and hidden jobs, reports, saved searches, followed companies, match scores, notifications and their delivery, notification settings.

### 3.5 Career agent (AI)

Messages with the agent and draft profile changes. Emails, phone numbers and document-like numbers are removed from the text before it reaches the model. Guest chats are tied to a random identifier in a cookie, not to a person.

Agent memory: short facts about you and your goals that you asked the agent to remember or added in Settings → Privacy → Spoki memory. The agent reads them in every conversation so it does not ask again. Contacts, links, passwords and keys are not accepted. You can edit or erase each fact, or erase the whole memory at once.

### 3.6 Consent

The cookie consent log: which categories are allowed, the policy version, whether Global Privacy Control was sent, where the choice was made and a hash of the IP address. It proves that consent was given.

### 3.7 Visit statistics

- For all visitors, without cookies: the page address without parameters, the event type (view, job opened, search, registration, application), the search text (up to 60 characters), the referring site, campaign tags, the device class (phone, tablet, computer). Daily unique visitors are counted with a key computed from the date, IP address and browser with a server secret; the IP and the browser string are not stored, and the key cannot be reversed or linked across days.
- Only with analytics consent: a random browser identifier in the "_ia" cookie to recognise returning visits. It is not linked to your account.

### 3.8 Technical data

Server logs: time, request address, response code, request id; emails and phone numbers are masked. IP addresses protect the service from abuse (rate limits) and are stored only as hashes.

## 4. Purposes and legal bases

| Purpose                                                                                | Data               | Legal basis (GDPR art. 6)                                                |
| -------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------ |
| Account, sign-in, profile, catalog, matching, applications, candidate–employer contact | 3.1–3.4            | contract (Terms of Use)                                                  |
| Notifications about your applications, matches, searches                               | 3.4                | contract; channels are configurable                                      |
| Career agent                                                                           | 3.5                | contract, at your request                                                |
| Newsletters                                                                            | email, Telegram    | consent (subscription), withdrawable any time                            |
| Moderation, fraud and spam prevention, security                                        | 3.1–3.4, 3.8       | legitimate interest in protecting users and the service                  |
| Cookieless statistics                                                                  | 3.7, first part    | legitimate interest in understanding the service without tracking people |
| Analytics cookie "_ia"                                                                 | 3.7, second part   | consent                                                                  |
| Remembering filters and viewed jobs                                                    | preference cookies | consent                                                                  |
| Consent log                                                                            | 3.6                | legal obligation to prove consent                                        |
| Requests from authorities                                                              | as requested       | legal obligation                                                         |

The automatic match score helps sort jobs and candidates but makes no decisions with legal effects on you: people decide on applications and hiring.

## 5. Cookies and similar technologies

Necessary cookies are always on — the site cannot work without them. Others are set only after your consent in the banner or in Settings → Privacy; refusing is as easy as accepting, and withdrawing consent deletes the related cookies.

| Cookie             | Purpose                                                   | Category    | Lifetime                                        |
| ------------------ | --------------------------------------------------------- | ----------- | ----------------------------------------------- |
| sb-…-auth-token    | signing in                                                | necessary   | while the session is active, renewed on sign-in |
| NEXT_LOCALE        | chosen language                                           | necessary   | until the browser is closed                     |
| cookie_consent     | your cookie choice, policy version and consent log record | necessary   | 1 year                                          |
| bot_session        | chat with the career agent before signing in              | necessary   | 30 days                                         |
| last_catalog_query | last catalog filters                                      | preferences | 30 days                                         |
| recent_jobs        | recently viewed jobs                                      | preferences | 30 days                                         |
| _ia                | random identifier for returning visits                    | analytics   | 13 months                                       |

The light or dark theme is kept in the browser's local storage and is not sent anywhere.

There are no third-party cookies, advertising or tracking scripts on the site. If your browser sends Global Privacy Control, analytics stays off whatever is chosen.

## 6. Who we share data with

### 6.1 Other users

- The employer of a job you applied to sees your profile without contacts; contacts only on mutual interest.
- Employers in matching see your profile without contacts unless you hide it in settings.
- Followers and all visitors see published jobs and company pages.
- An employer's job statistics contain only totals (views, sources, devices), nothing about people.

### 6.2 Processors acting on our instructions

| Service                                                           | Purpose                                                      | Where                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| Supabase                                                          | database, sign-in, logo storage                              | EU (Frankfurt)                   |
| Vercel                                                            | website hosting and scheduled tasks                          | global network, including the US |
| Resend                                                            | sending email                                                | US                               |
| Telegram                                                          | Telegram sign-in and bot notifications if you enabled them   | under Telegram's terms           |
| AI model provider (OpenRouter or Anthropic, whichever is enabled) | career agent answers; without emails and phone numbers (3.5) | US                               |
| Sentry (if enabled)                                               | server error reports without personal data                   | EU or US                         |

We have data processing agreements with processors; transfers outside the EEA rely on the European Commission's Standard Contractual Clauses or other lawful mechanisms. Use of data by the AI provider for training: {{aiTraining}}.

### 6.3 Others

Public authorities only on a lawful request. In a sale or reorganisation of the business, data may pass to the successor under this policy. Data is not sold or shared for advertising.

## 7. Retention

| Data                         | Period                                                               |
| ---------------------------- | -------------------------------------------------------------------- |
| Account and profile          | while the account exists; anonymised at once on deletion (section 9) |
| Candidate contacts           | until account deletion or change                                     |
| Applications                 | while the job exists; after account deletion without a link to you   |
| Messages to the career agent | 180 days                                                             |
| Agent memory                 | until you erase the fact or the account                              |
| Guest agent chats            | 30 days                                                              |
| Read notifications           | 90 days                                                              |
| Queued emails                | 90 days                                                              |
| Hidden and flagged jobs      | 365 days                                                             |
| Match scores                 | recomputed; deleted after 30 days                                    |
| Admin and security log       | 365 days                                                             |
| Consent log                  | 3 years                                                              |
| Visit statistics             | 395 days                                                             |
| Rate-limit counters          | 48 hours                                                             |
| Server logs                  | up to 30 days                                                        |
| Database backups             | per the provider's backup cycle: {{backupPeriod}}                    |

## 8. Security

Encrypted connections (HTTPS, HSTS), encrypted disks at the provider, role-based access, separate database roles with no schema changes from the application, a strict content security policy, rate limits, an admin action log, mandatory two-factor authentication for administrators, and staff access to personal data only with a stated reason recorded in the log. If a breach threatens your rights, we notify you and the supervisory authority within the time the law requires.

## 9. Your rights

- **Access and portability**: Settings → Privacy → Download your data — a JSON file with all data about you.
- **Rectification**: in the profile and settings; the rest on request.
- **Erasure**: Settings → Privacy → Delete account. The profile is anonymised ("Deleted user"); contacts, agent messages, agent memory, saved jobs and notifications are deleted; the sign-in account is deleted; applications stay with employers without your contacts; companies where you are the only owner are suspended.
- **Withdrawing consent**: cookies — in the banner or Settings → Privacy; newsletters — in notification settings or via the link in the email.
- **Objection and restriction** of processing based on legitimate interest — on request to {{privacyEmail}}.
- **Complaint** to the data protection authority of your country.

We answer requests within one month. To protect you, we may ask you to confirm the request from your account.

## 10. Children

The Service is not intended for people under {{minAge}}, and we do not knowingly collect their data. If you learn that such an account exists, tell us and we will delete it.

## 11. Changes

We announce material changes in advance by email and in the Service. If purposes based on consent change, we will ask for consent again — the same way the cookie banner asks again after the policy version changes.

## 12. Contact

- Data questions: {{privacyEmail}}
- General questions: {{supportEmail}}
- Postal address: {{address}}

<!-- pt-BR -->

# Política de Privacidade

Redação de {{effectiveDate}}. Identificador da versão {{version}}.

## 1. Em resumo

- Coletamos o que é necessário para encontrar trabalho e contratar, e não vendemos dados.
- Os contatos de um candidato só ficam visíveis para um empregador com interesse mútuo.
- Contamos as visitas nós mesmos, sem Google Analytics ou outros terceiros; o cookie de análise só é definido com o seu consentimento, e o sinal Global Privacy Control é respeitado.
- Você pode baixar seus dados, alterá-los, recusar cookies opcionais e excluir sua conta a qualquer momento em Configurações.

## 2. Quem é o responsável

O controlador dos dados é {{operator}}, {{address}}. Dúvidas sobre dados: {{privacyEmail}}.

## 3. O que coletamos

### 3.1 Conta

- E-mail e senha (nosso provedor de autenticação guarda apenas um hash; nunca a vemos) ou dados do Telegram quando você entra com o Telegram: id numérico, nome e nome de usuário. Não recebemos seu número de telefone do Telegram.
- Idioma da interface, data e versão dos termos aceitos, inscrição na newsletter (desativada por padrão).
- Registros de login: horário, país e tipo de dispositivo.

### 3.2 Perfil do candidato

Nome, título, cargos desejados, habilidades e níveis, experiência, idiomas, fuso horário e horário de trabalho, formato de trabalho e tipo de contratação, expectativa salarial, preferências de setor, visibilidade do perfil. Os contatos (e-mail, telefone, Telegram, LinkedIn, site) são guardados separadamente e só são mostrados a um empregador com interesse mútuo.

### 3.3 Empregadores e empresas

Nome e cargo do representante, dados da empresa (nome, descrição, site, logotipo, domínio de verificação), membros da empresa, vagas, histórico de verificação.

### 3.4 Atividade

Candidaturas e seus status, vagas salvas e ocultas, denúncias, pesquisas salvas, empresas seguidas, pontuações de correspondência, notificações e sua entrega, configurações de notificação.

### 3.5 Agente de carreira (IA)

Mensagens com o agente e rascunhos de alterações do perfil. E-mails, números de telefone e números semelhantes a documentos são removidos do texto antes de chegarem ao modelo. Conversas de visitantes ficam ligadas a um identificador aleatório em um cookie, não a uma pessoa.

Memória do agente: fatos curtos sobre você e seus objetivos que você pediu ao agente para lembrar ou adicionou em Configurações → Privacidade → Memória do Spoki. O agente os lê em cada conversa para não perguntar de novo. Contatos, links, senhas e chaves não são aceitos. Você pode editar ou apagar cada fato, ou apagar toda a memória de uma vez.

### 3.6 Consentimento

O registro de consentimento de cookies: quais categorias foram permitidas, a versão da política, se o Global Privacy Control foi enviado, onde a escolha foi feita e um hash do endereço IP. Ele comprova que o consentimento foi dado.

### 3.7 Estatísticas de visitas

- Para todos os visitantes, sem cookies: o endereço da página sem parâmetros, o tipo de evento (visualização, vaga aberta, pesquisa, cadastro, candidatura), o texto da pesquisa (até 60 caracteres), o site de origem, as marcações de campanha, a classe do dispositivo (celular, tablet, computador). Os visitantes únicos por dia são contados com uma chave calculada a partir da data, do endereço IP e do navegador com um segredo do servidor; o IP e a string do navegador não são guardados, e a chave não pode ser revertida nem ligada entre dias.
- Somente com consentimento de análise: um identificador aleatório do navegador no cookie "_ia" para reconhecer visitas recorrentes. Ele não é ligado à sua conta.

### 3.8 Dados técnicos

Logs do servidor: horário, endereço da requisição, código de resposta, id da requisição; e-mails e números de telefone são mascarados. Os endereços IP protegem o serviço contra abusos (limites de requisições) e são guardados apenas como hashes.

## 4. Finalidades e bases legais

| Finalidade                                                                                  | Dados                   | Base legal (art. 6 do RGPD)                                   |
| ------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| Conta, login, perfil, catálogo, correspondência, candidaturas, contato candidato–empregador | 3.1–3.4                 | contrato (Termos de Uso)                                      |
| Notificações sobre suas candidaturas, correspondências, pesquisas                           | 3.4                     | contrato; os canais são configuráveis                         |
| Agente de carreira                                                                          | 3.5                     | contrato, a seu pedido                                        |
| Newsletters                                                                                 | e-mail, Telegram        | consentimento (inscrição), revogável a qualquer momento       |
| Moderação, prevenção de fraude e spam, segurança                                            | 3.1–3.4, 3.8            | legítimo interesse em proteger os usuários e o serviço        |
| Estatísticas sem cookies                                                                    | 3.7, primeira parte     | legítimo interesse em entender o serviço sem rastrear pessoas |
| Cookie de análise "_ia"                                                                     | 3.7, segunda parte      | consentimento                                                 |
| Lembrar filtros e vagas vistas                                                              | cookies de preferências | consentimento                                                 |
| Registro de consentimento                                                                   | 3.6                     | obrigação legal de comprovar o consentimento                  |
| Pedidos de autoridades                                                                      | conforme o pedido       | obrigação legal                                               |

A pontuação automática de correspondência ajuda a ordenar vagas e candidatos, mas não toma decisões com efeitos jurídicos sobre você: pessoas decidem sobre candidaturas e contratações.

## 5. Cookies e tecnologias semelhantes

Os cookies necessários estão sempre ativos — o site não funciona sem eles. Os demais só são definidos após o seu consentimento no banner ou em Configurações → Privacidade; recusar é tão fácil quanto aceitar, e revogar o consentimento apaga os cookies correspondentes.

| Cookie             | Finalidade                                                             | Categoria    | Duração                                            |
| ------------------ | ---------------------------------------------------------------------- | ------------ | -------------------------------------------------- |
| sb-…-auth-token    | login                                                                  | necessário   | enquanto a sessão estiver ativa, renovado no login |
| NEXT_LOCALE        | idioma escolhido                                                       | necessário   | até o navegador ser fechado                        |
| cookie_consent     | sua escolha de cookies, versão da política e registro de consentimento | necessário   | 1 ano                                              |
| bot_session        | conversa com o agente de carreira antes do login                       | necessário   | 30 dias                                            |
| last_catalog_query | últimos filtros do catálogo                                            | preferências | 30 dias                                            |
| recent_jobs        | vagas vistas recentemente                                              | preferências | 30 dias                                            |
| _ia                | identificador aleatório para visitas recorrentes                       | análise      | 13 meses                                           |

O tema claro ou escuro fica no armazenamento local do navegador e não é enviado a lugar nenhum.

Não há cookies de terceiros, publicidade nem scripts de rastreamento no site. Se o seu navegador enviar Global Privacy Control, a análise fica desativada independentemente da escolha.

## 6. Com quem compartilhamos dados

### 6.1 Outros usuários

- O empregador de uma vaga à qual você se candidatou vê seu perfil sem contatos; os contatos só com interesse mútuo.
- Empregadores na correspondência veem seu perfil sem contatos, a menos que você o oculte nas configurações.
- Seguidores e todos os visitantes veem as vagas publicadas e as páginas das empresas.
- As estatísticas de vagas de um empregador contêm apenas totais (visualizações, origens, dispositivos), nada sobre pessoas.

### 6.2 Operadores que agem sob nossas instruções

| Serviço                                                                 | Finalidade                                                               | Onde                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| Supabase                                                                | banco de dados, login, armazenamento de logotipos                        | UE (Frankfurt)                 |
| Vercel                                                                  | hospedagem do site e tarefas agendadas                                   | rede global, incluindo os EUA  |
| Resend                                                                  | envio de e-mails                                                         | EUA                            |
| Telegram                                                                | login pelo Telegram e notificações do bot, se você as ativou             | conforme os termos do Telegram |
| Provedor do modelo de IA (OpenRouter ou Anthropic, o que estiver ativo) | respostas do agente de carreira; sem e-mails e números de telefone (3.5) | EUA                            |
| Sentry (se ativado)                                                     | relatórios de erros do servidor sem dados pessoais                       | UE ou EUA                      |

Temos acordos de tratamento de dados com os operadores; as transferências para fora do EEE se baseiam nas Cláusulas Contratuais Padrão da Comissão Europeia ou em outros mecanismos legais. Uso dos dados pelo provedor de IA para treinamento: {{aiTraining}}.

### 6.3 Outros

Autoridades públicas apenas mediante pedido legal. Em caso de venda ou reorganização do negócio, os dados podem passar ao sucessor nos termos desta política. Os dados não são vendidos nem compartilhados para publicidade.

## 7. Retenção

| Dados                                 | Prazo                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Conta e perfil                        | enquanto a conta existir; anonimizados imediatamente na exclusão (seção 9) |
| Contatos do candidato                 | até a exclusão ou alteração da conta                                       |
| Candidaturas                          | enquanto a vaga existir; após a exclusão da conta, sem vínculo com você    |
| Mensagens ao agente de carreira       | 180 dias                                                                   |
| Memória do agente                     | até você apagar o fato ou a conta                                          |
| Conversas de visitantes com o agente  | 30 dias                                                                    |
| Notificações lidas                    | 90 dias                                                                    |
| E-mails na fila                       | 90 dias                                                                    |
| Vagas ocultas e marcadas              | 365 dias                                                                   |
| Pontuações de correspondência         | recalculadas; excluídas após 30 dias                                       |
| Registro de administração e segurança | 365 dias                                                                   |
| Registro de consentimento             | 3 anos                                                                     |
| Estatísticas de visitas               | 395 dias                                                                   |
| Contadores de limite de requisições   | 48 horas                                                                   |
| Logs do servidor                      | até 30 dias                                                                |
| Cópias de segurança do banco de dados | conforme o ciclo de backup do provedor: {{backupPeriod}}                   |

## 8. Segurança

Conexões criptografadas (HTTPS, HSTS), discos criptografados no provedor, acesso por papéis, papéis de banco de dados separados sem alterações de esquema pela aplicação, uma política de segurança de conteúdo rígida, limites de requisições, um registro de ações de administração, autenticação em dois fatores obrigatória para administradores e acesso da equipe a dados pessoais apenas com motivo declarado e registrado no log. Se um incidente ameaçar seus direitos, notificamos você e a autoridade de controle no prazo exigido por lei.

## 9. Seus direitos

- **Acesso e portabilidade**: Configurações → Privacidade → Baixar seus dados — um arquivo JSON com todos os dados sobre você.
- **Correção**: no perfil e nas configurações; o restante mediante pedido.
- **Eliminação**: Configurações → Privacidade → Excluir conta. O perfil é anonimizado ("Usuário excluído"); contatos, mensagens ao agente, memória do agente, vagas salvas e notificações são excluídos; a conta de login é excluída; as candidaturas ficam com os empregadores sem os seus contatos; empresas em que você é o único proprietário são suspensas.
- **Revogação do consentimento**: cookies — no banner ou em Configurações → Privacidade; newsletters — nas configurações de notificação ou pelo link no e-mail.
- **Oposição e limitação** do tratamento baseado em legítimo interesse — mediante pedido para {{privacyEmail}}.
- **Reclamação** à autoridade de proteção de dados do seu país.

Respondemos aos pedidos em até um mês. Para proteger você, podemos pedir que confirme o pedido a partir da sua conta.

## 10. Crianças

O Serviço não se destina a pessoas com menos de {{minAge}}, e não coletamos seus dados conscientemente. Se souber que existe uma conta assim, avise-nos e nós a excluiremos.

## 11. Alterações

Anunciamos alterações relevantes com antecedência por e-mail e no Serviço. Se finalidades baseadas em consentimento mudarem, pediremos o consentimento novamente — da mesma forma que o banner de cookies pergunta de novo após a mudança de versão da política.

## 12. Contato

- Dúvidas sobre dados: {{privacyEmail}}
- Dúvidas gerais: {{supportEmail}}
- Endereço postal: {{address}}

<!-- es -->

# Política de privacidad

Versión del {{effectiveDate}}. Identificador de versión {{version}}.

## 1. En resumen

- Recopilamos lo necesario para encontrar trabajo y contratar, y no vendemos datos.
- Los contactos de un candidato solo los ve un empleador con interés mutuo.
- Contamos las visitas nosotros mismos, sin Google Analytics ni otros terceros; la cookie de analítica se instala solo con su consentimiento y se respeta la señal Global Privacy Control.
- Puede descargar sus datos, cambiarlos, rechazar las cookies opcionales y eliminar su cuenta en cualquier momento en Ajustes.

## 2. Quién es responsable

El responsable del tratamiento es {{operator}}, {{address}}. Preguntas sobre datos: {{privacyEmail}}.

## 3. Qué recopilamos

### 3.1 Cuenta

- Correo electrónico y contraseña (nuestro proveedor de autenticación guarda solo un hash; nosotros nunca la vemos), o datos de Telegram cuando inicia sesión con Telegram: id numérico, nombre y nombre de usuario. No recibimos su número de teléfono de Telegram.
- Idioma de la interfaz, fecha y versión de las condiciones aceptadas, suscripción al boletín (desactivada por defecto).
- Registros de inicio de sesión: hora, país y tipo de dispositivo.

### 3.2 Perfil del candidato

Nombre, titular, puestos deseados, habilidades y niveles, experiencia, idiomas, zona horaria y horario de trabajo, formato de trabajo y tipo de empleo, expectativas salariales, preferencias de sector, visibilidad del perfil. Los contactos (correo, teléfono, Telegram, LinkedIn, sitio web) se guardan por separado y se muestran a un empleador solo con interés mutuo.

### 3.3 Empleadores y empresas

Nombre y cargo del representante, datos de la empresa (nombre, descripción, sitio web, logotipo, dominio de verificación), miembros de la empresa, empleos, historial de verificación.

### 3.4 Actividad

Postulaciones y sus estados, empleos guardados y ocultos, reportes, búsquedas guardadas, empresas que sigue, porcentajes de coincidencia, notificaciones y su entrega, ajustes de notificaciones.

### 3.5 Agente de carrera (IA)

Mensajes con el agente y borradores de cambios del perfil. Los correos, números de teléfono y números con aspecto de documento se eliminan del texto antes de que llegue al modelo. Los chats de invitados se vinculan a un identificador aleatorio en una cookie, no a una persona.

Memoria del agente: datos breves sobre usted y sus objetivos que pidió al agente recordar o añadió en Ajustes → Privacidad → Memoria de Spoki. El agente los lee en cada conversación para no volver a preguntar. No se aceptan contactos, enlaces, contraseñas ni claves. Puede editar o borrar cada dato, o borrar toda la memoria de una vez.

### 3.6 Consentimiento

El registro de consentimiento de cookies: qué categorías están permitidas, la versión de la política, si se envió Global Privacy Control, dónde se hizo la elección y un hash de la dirección IP. Sirve para demostrar que se dio el consentimiento.

### 3.7 Estadísticas de visitas

- Para todos los visitantes, sin cookies: la dirección de la página sin parámetros, el tipo de evento (vista, empleo abierto, búsqueda, registro, postulación), el texto de búsqueda (hasta 60 caracteres), el sitio de procedencia, las etiquetas de campaña y la clase de dispositivo (teléfono, tableta, computadora). Los visitantes únicos diarios se cuentan con una clave calculada a partir de la fecha, la dirección IP y el navegador con un secreto del servidor; la IP y la cadena del navegador no se guardan, y la clave no puede revertirse ni vincularse entre días.
- Solo con consentimiento de analítica: un identificador aleatorio del navegador en la cookie «_ia» para reconocer visitas repetidas. No está vinculado a su cuenta.

### 3.8 Datos técnicos

Registros del servidor: hora, dirección de la solicitud, código de respuesta, id de la solicitud; los correos y números de teléfono se enmascaran. Las direcciones IP protegen el servicio contra abusos (límites de solicitudes) y se guardan solo como hashes.

## 4. Finalidades y bases jurídicas

| Finalidad                                                                                             | Datos                   | Base jurídica (art. 6 del RGPD)                                      |
| ----------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| Cuenta, inicio de sesión, perfil, catálogo, coincidencia, postulaciones, contacto candidato–empleador | 3.1–3.4                 | contrato (Condiciones de uso)                                        |
| Notificaciones sobre sus postulaciones, coincidencias y búsquedas                                     | 3.4                     | contrato; los canales se pueden configurar                           |
| Agente de carrera                                                                                     | 3.5                     | contrato, a petición suya                                            |
| Boletines                                                                                             | correo, Telegram        | consentimiento (suscripción), revocable en cualquier momento         |
| Moderación, prevención de fraude y spam, seguridad                                                    | 3.1–3.4, 3.8            | interés legítimo en proteger a los usuarios y el servicio            |
| Estadísticas sin cookies                                                                              | 3.7, primera parte      | interés legítimo en entender el servicio sin rastrear a las personas |
| Cookie de analítica «_ia»                                                                             | 3.7, segunda parte      | consentimiento                                                       |
| Recordar filtros y empleos vistos                                                                     | cookies de preferencias | consentimiento                                                       |
| Registro de consentimiento                                                                            | 3.6                     | obligación legal de demostrar el consentimiento                      |
| Solicitudes de autoridades                                                                            | según lo solicitado     | obligación legal                                                     |

El porcentaje automático de coincidencia ayuda a ordenar empleos y candidatos, pero no toma decisiones con efectos jurídicos sobre usted: las personas deciden sobre las postulaciones y la contratación.

## 5. Cookies y tecnologías similares

Las cookies necesarias están siempre activas: el sitio no funciona sin ellas. Las demás se instalan solo después de su consentimiento en el banner o en Ajustes → Privacidad; rechazar es tan fácil como aceptar, y retirar el consentimiento elimina las cookies correspondientes.

| Cookie             | Finalidad                                                                   | Categoría    | Duración                                                     |
| ------------------ | --------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------ |
| sb-…-auth-token    | inicio de sesión                                                            | necesaria    | mientras la sesión está activa, se renueva al iniciar sesión |
| NEXT_LOCALE        | idioma elegido                                                              | necesaria    | hasta cerrar el navegador                                    |
| cookie_consent     | su elección de cookies, versión de la política y registro de consentimiento | necesaria    | 1 año                                                        |
| bot_session        | chat con el agente de carrera antes de iniciar sesión                       | necesaria    | 30 días                                                      |
| last_catalog_query | últimos filtros del catálogo                                                | preferencias | 30 días                                                      |
| recent_jobs        | empleos vistos recientemente                                                | preferencias | 30 días                                                      |
| _ia                | identificador aleatorio para visitas repetidas                              | analítica    | 13 meses                                                     |

El tema claro u oscuro se guarda en el almacenamiento local del navegador y no se envía a ningún sitio.

En el sitio no hay cookies de terceros, publicidad ni scripts de seguimiento. Si su navegador envía Global Privacy Control, la analítica queda desactivada sea cual sea la elección.

## 6. Con quién compartimos datos

### 6.1 Otros usuarios

- El empleador de un empleo al que se postuló ve su perfil sin contactos; los contactos, solo con interés mutuo.
- Los empleadores en la coincidencia ven su perfil sin contactos, salvo que lo oculte en los ajustes.
- Los seguidores y todos los visitantes ven los empleos publicados y las páginas de empresas.
- Las estadísticas de empleos de un empleador contienen solo totales (vistas, fuentes, dispositivos), nada sobre personas.

### 6.2 Encargados que actúan según nuestras instrucciones

| Servicio                                                                  | Finalidad                                                                  | Dónde                             |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| Supabase                                                                  | base de datos, inicio de sesión, almacenamiento de logotipos               | UE (Fráncfort)                    |
| Vercel                                                                    | alojamiento del sitio y tareas programadas                                 | red global, incluidos EE. UU.     |
| Resend                                                                    | envío de correo                                                            | EE. UU.                           |
| Telegram                                                                  | inicio de sesión con Telegram y notificaciones del bot si las activó       | según las condiciones de Telegram |
| Proveedor del modelo de IA (OpenRouter o Anthropic, el que esté activado) | respuestas del agente de carrera; sin correos ni números de teléfono (3.5) | EE. UU.                           |
| Sentry (si está activado)                                                 | informes de errores del servidor sin datos personales                      | UE o EE. UU.                      |

Tenemos acuerdos de tratamiento de datos con los encargados; las transferencias fuera del EEE se basan en las Cláusulas Contractuales Tipo de la Comisión Europea u otros mecanismos legales. Uso de datos por el proveedor de IA para entrenamiento: {{aiTraining}}.

### 6.3 Otros

Autoridades públicas, solo ante una solicitud legal. En una venta o reorganización del negocio, los datos pueden pasar al sucesor conforme a esta política. Los datos no se venden ni se comparten con fines publicitarios.

## 7. Conservación

| Datos                                   | Plazo                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Cuenta y perfil                         | mientras exista la cuenta; se anonimizan en cuanto se elimina (sección 9) |
| Contactos del candidato                 | hasta que se elimine la cuenta o se cambien                               |
| Postulaciones                           | mientras exista el empleo; tras eliminar la cuenta, sin vínculo con usted |
| Mensajes al agente de carrera           | 180 días                                                                  |
| Memoria del agente                      | hasta que borre el dato o la cuenta                                       |
| Chats de invitados con el agente        | 30 días                                                                   |
| Notificaciones leídas                   | 90 días                                                                   |
| Correos en cola                         | 90 días                                                                   |
| Empleos ocultos y reportados            | 365 días                                                                  |
| Porcentajes de coincidencia             | se recalculan; se eliminan a los 30 días                                  |
| Registro de administración y seguridad  | 365 días                                                                  |
| Registro de consentimiento              | 3 años                                                                    |
| Estadísticas de visitas                 | 395 días                                                                  |
| Contadores de límites de solicitudes    | 48 horas                                                                  |
| Registros del servidor                  | hasta 30 días                                                             |
| Copias de seguridad de la base de datos | según el ciclo de copias del proveedor: {{backupPeriod}}                  |

## 8. Seguridad

Conexiones cifradas (HTTPS, HSTS), discos cifrados en el proveedor, acceso basado en roles, roles de base de datos separados sin cambios de esquema desde la aplicación, una política de seguridad de contenido estricta, límites de solicitudes, un registro de acciones de administración, autenticación en dos pasos obligatoria para los administradores y acceso del personal a datos personales solo con un motivo declarado que queda en el registro. Si una brecha amenaza sus derechos, le avisamos a usted y a la autoridad de control en el plazo que exige la ley.

## 9. Sus derechos

- **Acceso y portabilidad**: Ajustes → Privacidad → Descargar sus datos — un archivo JSON con todos los datos sobre usted.
- **Rectificación**: en el perfil y los ajustes; el resto, a petición.
- **Supresión**: Ajustes → Privacidad → Eliminar cuenta. El perfil se anonimiza («Usuario eliminado»); se eliminan los contactos, los mensajes con el agente, la memoria del agente, los empleos guardados y las notificaciones; se elimina la cuenta de inicio de sesión; las postulaciones quedan con los empleadores sin sus contactos; las empresas en las que usted es el único propietario se suspenden.
- **Retirada del consentimiento**: cookies — en el banner o en Ajustes → Privacidad; boletines — en los ajustes de notificaciones o con el enlace del correo.
- **Oposición y limitación** del tratamiento basado en interés legítimo — a petición en {{privacyEmail}}.
- **Reclamación** ante la autoridad de protección de datos de su país.

Respondemos a las solicitudes en el plazo de un mes. Para protegerle, podemos pedirle que confirme la solicitud desde su cuenta.

## 10. Menores

El Servicio no está dirigido a personas menores de {{minAge}} y no recopilamos sus datos a sabiendas. Si sabe que existe una cuenta así, avísenos y la eliminaremos.

## 11. Cambios

Anunciamos los cambios importantes con antelación por correo y en el Servicio. Si cambian las finalidades basadas en el consentimiento, volveremos a pedirlo — igual que el banner de cookies vuelve a preguntar cuando cambia la versión de la política.

## 12. Contacto

- Preguntas sobre datos: {{privacyEmail}}
- Preguntas generales: {{supportEmail}}
- Dirección postal: {{address}}

<!-- de -->

# Datenschutzerklärung

Fassung vom {{effectiveDate}}. Versionskennung {{version}}.

## 1. Kurz gesagt

- Wir erheben, was nötig ist, um Arbeit zu finden und einzustellen, und wir verkaufen keine Daten.
- Die Kontakte eines Kandidaten sind nur für einen Arbeitgeber mit beidseitigem Interesse sichtbar.
- Wir zählen Besuche selbst, ohne Google Analytics oder andere Dritte; das Analyse-Cookie wird nur mit Ihrer Einwilligung gesetzt, und das Signal Global Privacy Control wird beachtet.
- Sie können Ihre Daten jederzeit in den Einstellungen herunterladen, ändern, optionale Cookies ablehnen und Ihr Konto löschen.

## 2. Wer verantwortlich ist

Verantwortlicher ist {{operator}}, {{address}}. Fragen zu Daten: {{privacyEmail}}.

## 3. Was wir erheben

### 3.1 Konto

- E-Mail und Passwort (bei unserem Authentifizierungsanbieter wird nur ein Hash gespeichert; wir sehen es nie) oder Telegram-Daten, wenn Sie sich mit Telegram anmelden: numerische ID, Name und Benutzername. Ihre Telegram-Telefonnummer erhalten wir nicht.
- Sprache der Oberfläche, Datum und Version der akzeptierten Bedingungen, Newsletter-Abonnement (standardmäßig aus).
- Anmeldeeinträge: Zeit, Land und Gerätetyp.

### 3.2 Kandidatenprofil

Name, Überschrift, Wunschpositionen, Skills und Niveaus, Erfahrung, Sprachen, Zeitzone und Arbeitszeiten, Arbeitsmodell und Anstellungsart, Gehaltsvorstellungen, Branchenpräferenzen, Sichtbarkeit des Profils. Kontakte (E-Mail, Telefon, Telegram, LinkedIn, Website) werden getrennt gespeichert und einem Arbeitgeber nur bei beidseitigem Interesse gezeigt.

### 3.3 Arbeitgeber und Unternehmen

Name und Position der vertretenden Person, Unternehmensdaten (Name, Beschreibung, Website, Logo, Verifizierungsdomain), Mitglieder des Unternehmens, Jobs, Verlauf der Verifizierung.

### 3.4 Aktivität

Bewerbungen und ihre Status, gespeicherte und ausgeblendete Jobs, Meldungen, gespeicherte Suchen, gefolgte Unternehmen, Übereinstimmungen, Benachrichtigungen und ihre Zustellung, Benachrichtigungseinstellungen.

### 3.5 Karriere-Agent (KI)

Nachrichten mit dem Agenten und Entwürfe von Profiländerungen. E-Mail-Adressen, Telefonnummern und dokumentähnliche Nummern werden aus dem Text entfernt, bevor er das Modell erreicht. Gast-Chats sind an eine zufällige Kennung in einem Cookie gebunden, nicht an eine Person.

Gedächtnis des Agenten: kurze Fakten über Sie und Ihre Ziele, die Sie den Agenten zu merken gebeten oder unter Einstellungen → Datenschutz → Spoki-Gedächtnis hinzugefügt haben. Der Agent liest sie in jedem Gespräch, damit er nicht erneut fragt. Kontakte, Links, Passwörter und Schlüssel werden nicht angenommen. Sie können jeden Fakt bearbeiten oder löschen oder das ganze Gedächtnis auf einmal löschen.

### 3.6 Einwilligung

Das Protokoll der Cookie-Einwilligungen: welche Kategorien erlaubt sind, die Version der Richtlinie, ob Global Privacy Control gesendet wurde, wo die Auswahl getroffen wurde und ein Hash der IP-Adresse. Es belegt, dass die Einwilligung erteilt wurde.

### 3.7 Besuchsstatistik

- Für alle Besucher, ohne Cookies: die Seitenadresse ohne Parameter, die Art des Ereignisses (Aufruf, Job geöffnet, Suche, Registrierung, Bewerbung), der Suchtext (bis zu 60 Zeichen), die verweisende Website, Kampagnen-Tags, die Geräteklasse (Telefon, Tablet, Computer). Eindeutige Besucher pro Tag werden mit einem Schlüssel gezählt, der aus Datum, IP-Adresse und Browser mit einem Server-Geheimnis berechnet wird; die IP und die Browser-Kennung werden nicht gespeichert, und der Schlüssel kann weder zurückgerechnet noch über Tage hinweg verknüpft werden.
- Nur mit Einwilligung zur Analyse: eine zufällige Browser-Kennung im Cookie „_ia“, um wiederkehrende Besuche zu erkennen. Sie ist nicht mit Ihrem Konto verknüpft.

### 3.8 Technische Daten

Server-Logs: Zeit, Adresse der Anfrage, Antwortcode, Anfrage-ID; E-Mail-Adressen und Telefonnummern werden maskiert. IP-Adressen schützen den Dienst vor Missbrauch (Ratenbegrenzungen) und werden nur als Hashes gespeichert.

## 4. Zwecke und Rechtsgrundlagen

| Zweck                                                                                  | Daten             | Rechtsgrundlage (DSGVO Art. 6)                                              |
| -------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| Konto, Anmeldung, Profil, Katalog, Matching, Bewerbungen, Kontakt Kandidat–Arbeitgeber | 3.1–3.4           | Vertrag (Nutzungsbedingungen)                                               |
| Benachrichtigungen über Ihre Bewerbungen, Treffer, Suchen                              | 3.4               | Vertrag; Kanäle sind einstellbar                                            |
| Karriere-Agent                                                                         | 3.5               | Vertrag, auf Ihre Anfrage                                                   |
| Newsletter                                                                             | E-Mail, Telegram  | Einwilligung (Abonnement), jederzeit widerrufbar                            |
| Moderation, Verhinderung von Betrug und Spam, Sicherheit                               | 3.1–3.4, 3.8      | berechtigtes Interesse am Schutz der Nutzer und des Dienstes                |
| Statistik ohne Cookies                                                                 | 3.7, erster Teil  | berechtigtes Interesse, den Dienst zu verstehen, ohne Personen zu verfolgen |
| Analyse-Cookie „_ia“                                                                   | 3.7, zweiter Teil | Einwilligung                                                                |
| Merken von Filtern und angesehenen Jobs                                                | Präferenz-Cookies | Einwilligung                                                                |
| Einwilligungsprotokoll                                                                 | 3.6               | rechtliche Pflicht, die Einwilligung nachzuweisen                           |
| Anfragen von Behörden                                                                  | wie angefordert   | rechtliche Pflicht                                                          |

Die automatische Übereinstimmung hilft, Jobs und Kandidaten zu sortieren, trifft aber keine Entscheidungen mit rechtlicher Wirkung für Sie: Über Bewerbungen und Einstellungen entscheiden Menschen.

## 5. Cookies und ähnliche Technologien

Notwendige Cookies sind immer aktiv — ohne sie funktioniert die Website nicht. Andere werden nur nach Ihrer Einwilligung im Banner oder unter Einstellungen → Datenschutz gesetzt; Ablehnen ist so einfach wie Akzeptieren, und der Widerruf der Einwilligung löscht die zugehörigen Cookies.

| Cookie             | Zweck                                                                | Kategorie   | Laufzeit                                              |
| ------------------ | -------------------------------------------------------------------- | ----------- | ----------------------------------------------------- |
| sb-…-auth-token    | Anmeldung                                                            | notwendig   | solange die Sitzung aktiv ist, bei Anmeldung erneuert |
| NEXT_LOCALE        | gewählte Sprache                                                     | notwendig   | bis der Browser geschlossen wird                      |
| cookie_consent     | Ihre Cookie-Auswahl, Version der Richtlinie und Eintrag im Protokoll | notwendig   | 1 Jahr                                                |
| bot_session        | Chat mit dem Karriere-Agenten vor der Anmeldung                      | notwendig   | 30 Tage                                               |
| last_catalog_query | letzte Katalogfilter                                                 | Präferenzen | 30 Tage                                               |
| recent_jobs        | zuletzt angesehene Jobs                                              | Präferenzen | 30 Tage                                               |
| _ia                | zufällige Kennung für wiederkehrende Besuche                         | Analyse     | 13 Monate                                             |

Das helle oder dunkle Design wird im lokalen Speicher des Browsers gehalten und nirgendwohin gesendet.

Auf der Website gibt es keine Cookies von Dritten, keine Werbung und keine Tracking-Skripte. Wenn Ihr Browser Global Privacy Control sendet, bleibt die Analyse unabhängig von der Auswahl aus.

## 6. Mit wem wir Daten teilen

### 6.1 Andere Nutzer

- Der Arbeitgeber eines Jobs, auf den Sie sich beworben haben, sieht Ihr Profil ohne Kontakte; Kontakte nur bei beidseitigem Interesse.
- Arbeitgeber sehen Ihr Profil im Matching ohne Kontakte, sofern Sie es nicht in den Einstellungen verbergen.
- Follower und alle Besucher sehen veröffentlichte Jobs und Unternehmensseiten.
- Die Jobstatistik eines Arbeitgebers enthält nur Summen (Aufrufe, Quellen, Geräte), nichts über Personen.

### 6.2 Auftragsverarbeiter, die nach unseren Weisungen handeln

| Dienst                                                                                 | Zweck                                                                           | Wo                                    |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------- |
| Supabase                                                                               | Datenbank, Anmeldung, Speicherung von Logos                                     | EU (Frankfurt)                        |
| Vercel                                                                                 | Hosting der Website und geplante Aufgaben                                       | globales Netz, einschließlich der USA |
| Resend                                                                                 | Versand von E-Mails                                                             | USA                                   |
| Telegram                                                                               | Anmeldung mit Telegram und Bot-Benachrichtigungen, wenn Sie sie aktiviert haben | gemäß den Bedingungen von Telegram    |
| Anbieter des KI-Modells (OpenRouter oder Anthropic, je nachdem, welcher aktiviert ist) | Antworten des Karriere-Agenten; ohne E-Mail-Adressen und Telefonnummern (3.5)   | USA                                   |
| Sentry (falls aktiviert)                                                               | Fehlerberichte des Servers ohne personenbezogene Daten                          | EU oder USA                           |

Mit den Auftragsverarbeitern haben wir Verträge zur Auftragsverarbeitung; Übermittlungen außerhalb des EWR stützen sich auf die Standardvertragsklauseln der Europäischen Kommission oder andere rechtmäßige Mechanismen. Nutzung der Daten durch den KI-Anbieter zum Training: {{aiTraining}}.

### 6.3 Andere

Behörden nur auf rechtmäßige Anfrage. Bei einem Verkauf oder einer Umstrukturierung des Geschäfts können Daten nach dieser Richtlinie auf den Rechtsnachfolger übergehen. Daten werden nicht verkauft und nicht für Werbung weitergegeben.

## 7. Aufbewahrung

| Daten                               | Frist                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Konto und Profil                    | solange das Konto besteht; bei Löschung sofort anonymisiert (Abschnitt 9)  |
| Kontakte von Kandidaten             | bis zur Löschung des Kontos oder Änderung                                  |
| Bewerbungen                         | solange der Job besteht; nach Löschung des Kontos ohne Verbindung zu Ihnen |
| Nachrichten an den Karriere-Agenten | 180 Tage                                                                   |
| Gedächtnis des Agenten              | bis Sie den Fakt oder das Konto löschen                                    |
| Gast-Chats mit dem Agenten          | 30 Tage                                                                    |
| Gelesene Benachrichtigungen         | 90 Tage                                                                    |
| E-Mails in der Warteschlange        | 90 Tage                                                                    |
| Ausgeblendete und gemeldete Jobs    | 365 Tage                                                                   |
| Übereinstimmungen                   | werden neu berechnet; nach 30 Tagen gelöscht                               |
| Admin- und Sicherheitsprotokoll     | 365 Tage                                                                   |
| Einwilligungsprotokoll              | 3 Jahre                                                                    |
| Besuchsstatistik                    | 395 Tage                                                                   |
| Zähler der Ratenbegrenzung          | 48 Stunden                                                                 |
| Server-Logs                         | bis zu 30 Tage                                                             |
| Datenbanksicherungen                | gemäß dem Sicherungszyklus des Anbieters: {{backupPeriod}}                 |

## 8. Sicherheit

Verschlüsselte Verbindungen (HTTPS, HSTS), verschlüsselte Datenträger beim Anbieter, rollenbasierter Zugriff, getrennte Datenbankrollen ohne Schemaänderungen aus der Anwendung, eine strikte Content Security Policy, Ratenbegrenzungen, ein Protokoll der Admin-Aktionen, verpflichtende Zwei-Faktor-Authentifizierung für Administratoren und Zugriff von Mitarbeitenden auf personenbezogene Daten nur mit einem angegebenen, im Protokoll erfassten Grund. Wenn eine Verletzung Ihre Rechte gefährdet, benachrichtigen wir Sie und die Aufsichtsbehörde innerhalb der gesetzlich vorgeschriebenen Frist.

## 9. Ihre Rechte

- **Auskunft und Übertragbarkeit**: Einstellungen → Datenschutz → Ihre Daten herunterladen — eine JSON-Datei mit allen Daten über Sie.
- **Berichtigung**: im Profil und in den Einstellungen; alles andere auf Anfrage.
- **Löschung**: Einstellungen → Datenschutz → Konto löschen. Das Profil wird anonymisiert („Gelöschter Nutzer“); Kontakte, Nachrichten an den Agenten, das Gedächtnis des Agenten, gespeicherte Jobs und Benachrichtigungen werden gelöscht; das Anmeldekonto wird gelöscht; Bewerbungen bleiben ohne Ihre Kontakte bei den Arbeitgebern; Unternehmen, deren einziger Inhaber Sie sind, werden gesperrt.
- **Widerruf der Einwilligung**: Cookies — im Banner oder unter Einstellungen → Datenschutz; Newsletter — in den Benachrichtigungseinstellungen oder über den Link in der E-Mail.
- **Widerspruch und Einschränkung** der Verarbeitung auf Grundlage berechtigten Interesses — auf Anfrage an {{privacyEmail}}.
- **Beschwerde** bei der Datenschutzbehörde Ihres Landes.

Wir beantworten Anfragen innerhalb eines Monats. Zu Ihrem Schutz können wir Sie bitten, die Anfrage aus Ihrem Konto zu bestätigen.

## 10. Kinder

Der Dienst ist nicht für Personen unter {{minAge}} bestimmt, und wir erheben ihre Daten nicht wissentlich. Wenn Sie erfahren, dass ein solches Konto existiert, teilen Sie es uns mit, und wir löschen es.

## 11. Änderungen

Wesentliche Änderungen kündigen wir im Voraus per E-Mail und im Dienst an. Wenn sich auf Einwilligung beruhende Zwecke ändern, bitten wir erneut um Einwilligung — so wie das Cookie-Banner nach einer Änderung der Richtlinienversion erneut fragt.

## 12. Kontakt

- Fragen zu Daten: {{privacyEmail}}
- Allgemeine Fragen: {{supportEmail}}
- Postanschrift: {{address}}

<!-- fr -->

# Politique de confidentialité

Version du {{effectiveDate}}. Identifiant de version {{version}}.

## 1. En bref

- Nous collectons ce qui est nécessaire pour trouver un travail et recruter, et nous ne vendons pas de données.
- Les coordonnées d’un candidat ne sont visibles que par un employeur en cas d’intérêt mutuel.
- Nous comptons les visites nous-mêmes, sans Google Analytics ni autres tiers ; le cookie de statistiques n’est déposé qu’avec votre consentement, et le signal Global Privacy Control est respecté.
- Vous pouvez télécharger vos données, les modifier, refuser les cookies facultatifs et supprimer votre compte à tout moment dans les Paramètres.

## 2. Qui est responsable

Le responsable du traitement est {{operator}}, {{address}}. Questions sur les données : {{privacyEmail}}.

## 3. Ce que nous collectons

### 3.1 Compte

- E-mail et mot de passe (seul un hachage est conservé par notre fournisseur d’authentification ; nous ne le voyons jamais), ou les données Telegram lorsque vous vous connectez avec Telegram : identifiant numérique, nom et nom d’utilisateur. Nous ne recevons pas votre numéro de téléphone Telegram.
- Langue de l’interface, date et version des conditions acceptées, abonnement à la newsletter (désactivé par défaut).
- Historique des connexions : heure, pays et type d’appareil.

### 3.2 Profil de candidat

Nom, titre, postes souhaités, compétences et niveaux, expérience, langues, fuseau horaire et heures de travail, mode de travail et type de contrat, attentes salariales, préférences de secteur, visibilité du profil. Les coordonnées (e-mail, téléphone, Telegram, LinkedIn, site web) sont stockées séparément et ne sont montrées à un employeur qu’en cas d’intérêt mutuel.

### 3.3 Employeurs et entreprises

Nom et fonction du représentant, données de l’entreprise (nom, description, site web, logo, domaine de vérification), membres de l’entreprise, offres, historique de vérification.

### 3.4 Activité

Candidatures et leurs statuts, offres enregistrées et masquées, signalements, recherches enregistrées, entreprises suivies, scores de correspondance, notifications et leur remise, paramètres de notifications.

### 3.5 Agent carrière (IA)

Les messages échangés avec l’agent et les brouillons de modifications du profil. Les e-mails, numéros de téléphone et numéros ressemblant à des pièces d’identité sont retirés du texte avant qu’il n’atteigne le modèle. Les conversations des invités sont liées à un identifiant aléatoire dans un cookie, pas à une personne.

Mémoire de l’agent : de courts faits sur vous et vos objectifs que vous avez demandé à l’agent de retenir ou ajoutés dans Paramètres → Confidentialité → Mémoire de Spoki. L’agent les lit dans chaque conversation pour ne pas redemander. Les coordonnées, liens, mots de passe et clés ne sont pas acceptés. Vous pouvez modifier ou effacer chaque fait, ou effacer toute la mémoire d’un coup.

### 3.6 Consentement

Le registre des consentements aux cookies : les catégories autorisées, la version de la politique, si Global Privacy Control a été envoyé, l’endroit où le choix a été fait et un hachage de l’adresse IP. Il prouve que le consentement a été donné.

### 3.7 Statistiques de visite

- Pour tous les visiteurs, sans cookies : l’adresse de la page sans paramètres, le type d’événement (vue, offre ouverte, recherche, inscription, candidature), le texte de recherche (jusqu’à 60 caractères), le site référent, les balises de campagne, la catégorie d’appareil (téléphone, tablette, ordinateur). Les visiteurs uniques quotidiens sont comptés à l’aide d’une clé calculée à partir de la date, de l’adresse IP et du navigateur avec un secret du serveur ; l’IP et la chaîne du navigateur ne sont pas conservées, et la clé ne peut être ni inversée ni reliée d’un jour à l’autre.
- Uniquement avec consentement aux statistiques : un identifiant aléatoire du navigateur dans le cookie « _ia » pour reconnaître les visites répétées. Il n’est pas lié à votre compte.

### 3.8 Données techniques

Journaux du serveur : heure, adresse de la requête, code de réponse, identifiant de requête ; les e-mails et numéros de téléphone sont masqués. Les adresses IP protègent le service contre les abus (limites de débit) et ne sont conservées que sous forme de hachage.

## 4. Finalités et bases légales

| Finalité                                                                                       | Données                | Base légale (RGPD art. 6)                                          |
| ---------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| Compte, connexion, profil, catalogue, correspondance, candidatures, contact candidat–employeur | 3.1–3.4                | contrat (Conditions d’utilisation)                                 |
| Notifications sur vos candidatures, correspondances, recherches                                | 3.4                    | contrat ; canaux configurables                                     |
| Agent carrière                                                                                 | 3.5                    | contrat, à votre demande                                           |
| Newsletters                                                                                    | e-mail, Telegram       | consentement (abonnement), révocable à tout moment                 |
| Modération, prévention de la fraude et du spam, sécurité                                       | 3.1–3.4, 3.8           | intérêt légitime à protéger les utilisateurs et le service         |
| Statistiques sans cookies                                                                      | 3.7, première partie   | intérêt légitime à comprendre le service sans suivre les personnes |
| Cookie de statistiques « _ia »                                                                 | 3.7, deuxième partie   | consentement                                                       |
| Mémorisation des filtres et des offres consultées                                              | cookies de préférences | consentement                                                       |
| Registre des consentements                                                                     | 3.6                    | obligation légale de prouver le consentement                       |
| Demandes des autorités                                                                         | selon la demande       | obligation légale                                                  |

Le score de correspondance automatique aide à trier les offres et les candidats mais ne prend aucune décision produisant des effets juridiques à votre égard : ce sont des personnes qui décident des candidatures et des recrutements.

## 5. Cookies et technologies similaires

Les cookies nécessaires sont toujours actifs — le site ne peut pas fonctionner sans eux. Les autres ne sont déposés qu’après votre consentement dans le bandeau ou dans Paramètres → Confidentialité ; refuser est aussi simple qu’accepter, et retirer son consentement supprime les cookies correspondants.

| Cookie             | Finalité                                                              | Catégorie    | Durée                                                    |
| ------------------ | --------------------------------------------------------------------- | ------------ | -------------------------------------------------------- |
| sb-…-auth-token    | connexion                                                             | nécessaire   | tant que la session est active, renouvelé à la connexion |
| NEXT_LOCALE        | langue choisie                                                        | nécessaire   | jusqu’à la fermeture du navigateur                       |
| cookie_consent     | votre choix de cookies, version de la politique et entrée du registre | nécessaire   | 1 an                                                     |
| bot_session        | conversation avec l’agent carrière avant la connexion                 | nécessaire   | 30 jours                                                 |
| last_catalog_query | derniers filtres du catalogue                                         | préférences  | 30 jours                                                 |
| recent_jobs        | offres récemment consultées                                           | préférences  | 30 jours                                                 |
| _ia                | identifiant aléatoire pour les visites répétées                       | statistiques | 13 mois                                                  |

Le thème clair ou sombre est conservé dans le stockage local du navigateur et n’est envoyé nulle part.

Il n’y a sur le site ni cookies tiers, ni publicité, ni scripts de suivi. Si votre navigateur envoie Global Privacy Control, les statistiques restent désactivées quel que soit le choix.

## 6. Avec qui nous partageons les données

### 6.1 Autres utilisateurs

- L’employeur d’une offre à laquelle vous avez postulé voit votre profil sans coordonnées ; les coordonnées uniquement en cas d’intérêt mutuel.
- Les employeurs voient, dans la correspondance, votre profil sans coordonnées, sauf si vous le masquez dans les paramètres.
- Les abonnés et tous les visiteurs voient les offres publiées et les pages d’entreprise.
- Les statistiques d’offres d’un employeur ne contiennent que des totaux (vues, sources, appareils), rien sur les personnes.

### 6.2 Sous-traitants agissant sur nos instructions

| Service                                                                          | Finalité                                                                  | Lieu                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| Supabase                                                                         | base de données, connexion, stockage des logos                            | UE (Francfort)                           |
| Vercel                                                                           | hébergement du site et tâches planifiées                                  | réseau mondial, y compris les États-Unis |
| Resend                                                                           | envoi des e-mails                                                         | États-Unis                               |
| Telegram                                                                         | connexion Telegram et notifications du bot si vous les avez activées      | selon les conditions de Telegram         |
| Fournisseur du modèle d’IA (OpenRouter ou Anthropic, selon celui qui est activé) | réponses de l’agent carrière ; sans e-mails ni numéros de téléphone (3.5) | États-Unis                               |
| Sentry (s’il est activé)                                                         | rapports d’erreurs du serveur sans données personnelles                   | UE ou États-Unis                         |

Nous avons des accords de traitement des données avec les sous-traitants ; les transferts hors de l’EEE reposent sur les clauses contractuelles types de la Commission européenne ou sur d’autres mécanismes licites. Utilisation des données par le fournisseur d’IA pour l’entraînement : {{aiTraining}}.

### 6.3 Autres

Les autorités publiques uniquement sur demande légale. En cas de vente ou de réorganisation de l’activité, les données peuvent être transmises au successeur dans le cadre de la présente politique. Les données ne sont ni vendues ni partagées à des fins publicitaires.

## 7. Conservation

| Données                                 | Durée                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| Compte et profil                        | tant que le compte existe ; anonymisés immédiatement à la suppression (section 9) |
| Coordonnées des candidats               | jusqu’à la suppression du compte ou leur modification                             |
| Candidatures                            | tant que l’offre existe ; après suppression du compte, sans lien avec vous        |
| Messages à l’agent carrière             | 180 jours                                                                         |
| Mémoire de l’agent                      | jusqu’à l’effacement du fait ou du compte                                         |
| Conversations des invités avec l’agent  | 30 jours                                                                          |
| Notifications lues                      | 90 jours                                                                          |
| E-mails en file d’attente               | 90 jours                                                                          |
| Offres masquées et signalées            | 365 jours                                                                         |
| Scores de correspondance                | recalculés ; supprimés après 30 jours                                             |
| Journal d’administration et de sécurité | 365 jours                                                                         |
| Registre des consentements              | 3 ans                                                                             |
| Statistiques de visite                  | 395 jours                                                                         |
| Compteurs de limites de débit           | 48 heures                                                                         |
| Journaux du serveur                     | jusqu’à 30 jours                                                                  |
| Sauvegardes de la base de données       | selon le cycle de sauvegarde du fournisseur : {{backupPeriod}}                    |

## 8. Sécurité

Connexions chiffrées (HTTPS, HSTS), disques chiffrés chez le fournisseur, accès fondé sur les rôles, rôles de base de données distincts sans modification du schéma depuis l’application, politique de sécurité du contenu stricte, limites de débit, journal des actions d’administration, authentification à deux facteurs obligatoire pour les administrateurs, et accès du personnel aux données personnelles uniquement avec un motif déclaré et consigné dans le journal. Si une violation menace vos droits, nous vous en informons, ainsi que l’autorité de contrôle, dans les délais prévus par la loi.

## 9. Vos droits

- **Accès et portabilité** : Paramètres → Confidentialité → Télécharger vos données — un fichier JSON contenant toutes les données vous concernant.
- **Rectification** : dans le profil et les paramètres ; le reste sur demande.
- **Effacement** : Paramètres → Confidentialité → Supprimer le compte. Le profil est anonymisé (« Utilisateur supprimé ») ; les coordonnées, les messages à l’agent, la mémoire de l’agent, les offres enregistrées et les notifications sont supprimés ; le compte de connexion est supprimé ; les candidatures restent chez les employeurs sans vos coordonnées ; les entreprises dont vous êtes le seul propriétaire sont suspendues.
- **Retrait du consentement** : cookies — dans le bandeau ou dans Paramètres → Confidentialité ; newsletters — dans les paramètres de notifications ou via le lien dans l’e-mail.
- **Opposition et limitation** du traitement fondé sur l’intérêt légitime — sur demande à {{privacyEmail}}.
- **Réclamation** auprès de l’autorité de protection des données de votre pays.

Nous répondons aux demandes dans un délai d’un mois. Pour vous protéger, nous pouvons vous demander de confirmer la demande depuis votre compte.

## 10. Enfants

Le Service n’est pas destiné aux personnes de moins de {{minAge}}, et nous ne collectons pas sciemment leurs données. Si vous apprenez qu’un tel compte existe, prévenez-nous et nous le supprimerons.

## 11. Modifications

Nous annonçons les modifications importantes à l’avance par e-mail et dans le Service. Si des finalités fondées sur le consentement changent, nous redemanderons votre consentement — de la même manière que le bandeau des cookies le redemande après un changement de version de la politique.

## 12. Contact

- Questions sur les données : {{privacyEmail}}
- Questions générales : {{supportEmail}}
- Adresse postale : {{address}}

<!-- it -->

# Informativa sulla privacy

Versione del {{effectiveDate}}. Identificativo di versione {{version}}.

## 1. In breve

- Raccogliamo ciò che serve per trovare lavoro e assumere, e non vendiamo dati.
- I contatti di un candidato sono visibili solo a un datore di lavoro con interesse reciproco.
- Contiamo le visite da soli, senza Google Analytics o altre terze parti; il cookie di statistica viene impostato solo con il tuo consenso, e il segnale Global Privacy Control viene rispettato.
- Puoi scaricare i tuoi dati, modificarli, rifiutare i cookie facoltativi ed eliminare il tuo account in qualsiasi momento nelle Impostazioni.

## 2. Chi è responsabile

Il titolare del trattamento è {{operator}}, {{address}}. Domande sui dati: {{privacyEmail}}.

## 3. Cosa raccogliamo

### 3.1 Account

- Email e password (il nostro fornitore di autenticazione conserva solo un hash; noi non la vediamo mai), oppure i dati Telegram quando accedi con Telegram: ID numerico, nome e nome utente. Non riceviamo il tuo numero di telefono di Telegram.
- Lingua dell’interfaccia, data e versione dei termini accettati, iscrizione alla newsletter (disattivata per impostazione predefinita).
- Registro degli accessi: ora, paese e tipo di dispositivo.

### 3.2 Profilo del candidato

Nome, titolo, ruoli desiderati, competenze e livelli, esperienza, lingue, fuso orario e orari di lavoro, modalità di lavoro e tipo di contratto, aspettative di stipendio, preferenze di settore, visibilità del profilo. I contatti (email, telefono, Telegram, LinkedIn, sito web) sono conservati separatamente e mostrati a un datore di lavoro solo con l’interesse reciproco.

### 3.3 Datori di lavoro e aziende

Nome e ruolo del rappresentante, dati dell’azienda (nome, descrizione, sito web, logo, dominio di verifica), membri dell’azienda, offerte, storico delle verifiche.

### 3.4 Attività

Candidature e relativi stati, offerte salvate e nascoste, segnalazioni, ricerche salvate, aziende seguite, punteggi di corrispondenza, notifiche e relativa consegna, impostazioni delle notifiche.

### 3.5 Agente di carriera (IA)

I messaggi con l’agente e le bozze di modifica del profilo. Email, numeri di telefono e numeri simili a documenti vengono rimossi dal testo prima che raggiunga il modello. Le chat degli ospiti sono legate a un identificativo casuale in un cookie, non a una persona.

Memoria dell’agente: brevi fatti su di te e sui tuoi obiettivi che hai chiesto all’agente di ricordare o hai aggiunto in Impostazioni → Privacy → Memoria di Spoki. L’agente li legge in ogni conversazione per non chiedere di nuovo. Contatti, link, password e chiavi non vengono accettati. Puoi modificare o cancellare ogni fatto, o cancellare tutta la memoria in una volta.

### 3.6 Consenso

Il registro dei consensi ai cookie: quali categorie sono consentite, la versione dell’informativa, se è stato inviato Global Privacy Control, dove è stata fatta la scelta e un hash dell’indirizzo IP. Dimostra che il consenso è stato dato.

### 3.7 Statistiche delle visite

- Per tutti i visitatori, senza cookie: l’indirizzo della pagina senza parametri, il tipo di evento (visualizzazione, offerta aperta, ricerca, registrazione, candidatura), il testo di ricerca (fino a 60 caratteri), il sito di provenienza, i tag di campagna, la classe di dispositivo (telefono, tablet, computer). I visitatori unici giornalieri sono contati con una chiave calcolata da data, indirizzo IP e browser con un segreto del server; l’IP e la stringa del browser non vengono conservati, e la chiave non può essere invertita né collegata tra giorni diversi.
- Solo con il consenso alle statistiche: un identificativo casuale del browser nel cookie «_ia» per riconoscere le visite di ritorno. Non è collegato al tuo account.

### 3.8 Dati tecnici

Log del server: ora, indirizzo della richiesta, codice di risposta, ID della richiesta; email e numeri di telefono sono mascherati. Gli indirizzi IP proteggono il servizio dagli abusi (limiti di frequenza) e sono conservati solo come hash.

## 4. Finalità e basi giuridiche

| Finalità                                                                                    | Dati                 | Base giuridica (GDPR art. 6)                                             |
| ------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| Account, accesso, profilo, catalogo, corrispondenza, candidature, contatto candidato–datore | 3.1–3.4              | contratto (Termini di utilizzo)                                          |
| Notifiche su candidature, corrispondenze, ricerche                                          | 3.4                  | contratto; i canali sono configurabili                                   |
| Agente di carriera                                                                          | 3.5                  | contratto, su tua richiesta                                              |
| Newsletter                                                                                  | email, Telegram      | consenso (iscrizione), revocabile in qualsiasi momento                   |
| Moderazione, prevenzione di frodi e spam, sicurezza                                         | 3.1–3.4, 3.8         | legittimo interesse a proteggere gli utenti e il servizio                |
| Statistiche senza cookie                                                                    | 3.7, prima parte     | legittimo interesse a comprendere il servizio senza tracciare le persone |
| Cookie di statistica «_ia»                                                                  | 3.7, seconda parte   | consenso                                                                 |
| Memorizzazione di filtri e offerte viste                                                    | cookie di preferenza | consenso                                                                 |
| Registro dei consensi                                                                       | 3.6                  | obbligo legale di dimostrare il consenso                                 |
| Richieste delle autorità                                                                    | secondo la richiesta | obbligo legale                                                           |

Il punteggio di corrispondenza automatico aiuta a ordinare offerte e candidati ma non prende decisioni con effetti giuridici su di te: sulle candidature e sulle assunzioni decidono le persone.

## 5. Cookie e tecnologie simili

I cookie necessari sono sempre attivi — il sito non può funzionare senza di essi. Gli altri vengono impostati solo dopo il tuo consenso nel banner o in Impostazioni → Privacy; rifiutare è semplice quanto accettare, e revocare il consenso elimina i relativi cookie.

| Cookie             | Finalità                                                                | Categoria   | Durata                                             |
| ------------------ | ----------------------------------------------------------------------- | ----------- | -------------------------------------------------- |
| sb-…-auth-token    | accesso                                                                 | necessario  | finché la sessione è attiva, rinnovato all’accesso |
| NEXT_LOCALE        | lingua scelta                                                           | necessario  | fino alla chiusura del browser                     |
| cookie_consent     | la tua scelta sui cookie, versione dell’informativa e voce del registro | necessario  | 1 anno                                             |
| bot_session        | chat con l’agente di carriera prima dell’accesso                        | necessario  | 30 giorni                                          |
| last_catalog_query | ultimi filtri del catalogo                                              | preferenze  | 30 giorni                                          |
| recent_jobs        | offerte viste di recente                                                | preferenze  | 30 giorni                                          |
| _ia                | identificativo casuale per le visite di ritorno                         | statistiche | 13 mesi                                            |

Il tema chiaro o scuro è conservato nella memoria locale del browser e non viene inviato da nessuna parte.

Sul sito non ci sono cookie di terze parti, pubblicità né script di tracciamento. Se il tuo browser invia Global Privacy Control, le statistiche restano disattivate qualunque sia la scelta.

## 6. Con chi condividiamo i dati

### 6.1 Altri utenti

- Il datore di lavoro di un’offerta a cui ti sei candidato vede il tuo profilo senza contatti; i contatti solo con l’interesse reciproco.
- I datori di lavoro vedono nella corrispondenza il tuo profilo senza contatti, salvo che tu lo nasconda nelle impostazioni.
- I follower e tutti i visitatori vedono le offerte pubblicate e le pagine aziendali.
- Le statistiche delle offerte di un datore di lavoro contengono solo totali (visualizzazioni, fonti, dispositivi), nulla sulle persone.

### 6.2 Responsabili del trattamento che agiscono su nostra istruzione

| Servizio                                                              | Finalità                                                                 | Dove                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| Supabase                                                              | database, accesso, archiviazione dei loghi                               | UE (Francoforte)                      |
| Vercel                                                                | hosting del sito e attività pianificate                                  | rete globale, inclusi gli Stati Uniti |
| Resend                                                                | invio di email                                                           | Stati Uniti                           |
| Telegram                                                              | accesso con Telegram e notifiche del bot se le hai attivate              | secondo i termini di Telegram         |
| Fornitore del modello di IA (OpenRouter o Anthropic, quello attivato) | risposte dell’agente di carriera; senza email e numeri di telefono (3.5) | Stati Uniti                           |
| Sentry (se attivato)                                                  | segnalazioni di errori del server senza dati personali                   | UE o Stati Uniti                      |

Abbiamo accordi sul trattamento dei dati con i responsabili; i trasferimenti al di fuori del SEE si basano sulle clausole contrattuali tipo della Commissione europea o su altri meccanismi leciti. Uso dei dati da parte del fornitore di IA per l’addestramento: {{aiTraining}}.

### 6.3 Altri

Le autorità pubbliche solo su richiesta legittima. In caso di vendita o riorganizzazione dell’attività, i dati possono passare al successore nell’ambito della presente informativa. I dati non vengono venduti né condivisi per pubblicità.

## 7. Conservazione

| Dati                                    | Periodo                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| Account e profilo                       | finché l’account esiste; anonimizzati subito alla cancellazione (sezione 9)         |
| Contatti dei candidati                  | fino alla cancellazione dell’account o alla modifica                                |
| Candidature                             | finché l’offerta esiste; dopo la cancellazione dell’account senza collegamento a te |
| Messaggi all’agente di carriera         | 180 giorni                                                                          |
| Memoria dell’agente                     | finché non cancelli il fatto o l’account                                            |
| Chat degli ospiti con l’agente          | 30 giorni                                                                           |
| Notifiche lette                         | 90 giorni                                                                           |
| Email in coda                           | 90 giorni                                                                           |
| Offerte nascoste e segnalate            | 365 giorni                                                                          |
| Punteggi di corrispondenza              | ricalcolati; eliminati dopo 30 giorni                                               |
| Registro di amministrazione e sicurezza | 365 giorni                                                                          |
| Registro dei consensi                   | 3 anni                                                                              |
| Statistiche delle visite                | 395 giorni                                                                          |
| Contatori dei limiti di frequenza       | 48 ore                                                                              |
| Log del server                          | fino a 30 giorni                                                                    |
| Backup del database                     | secondo il ciclo di backup del fornitore: {{backupPeriod}}                          |

## 8. Sicurezza

Connessioni cifrate (HTTPS, HSTS), dischi cifrati presso il fornitore, accesso basato sui ruoli, ruoli del database separati senza modifiche dello schema dall’applicazione, una rigorosa Content Security Policy, limiti di frequenza, un registro delle azioni amministrative, autenticazione a due fattori obbligatoria per gli amministratori e accesso del personale ai dati personali solo con un motivo dichiarato e registrato nel log. Se una violazione mette a rischio i tuoi diritti, informiamo te e l’autorità di controllo entro i termini previsti dalla legge.

## 9. I tuoi diritti

- **Accesso e portabilità**: Impostazioni → Privacy → Scarica i tuoi dati — un file JSON con tutti i dati che ti riguardano.
- **Rettifica**: nel profilo e nelle impostazioni; il resto su richiesta.
- **Cancellazione**: Impostazioni → Privacy → Elimina l’account. Il profilo viene anonimizzato («Utente eliminato»); contatti, messaggi all’agente, memoria dell’agente, offerte salvate e notifiche vengono eliminati; l’account di accesso viene eliminato; le candidature restano ai datori di lavoro senza i tuoi contatti; le aziende di cui sei l’unico proprietario vengono sospese.
- **Revoca del consenso**: cookie — nel banner o in Impostazioni → Privacy; newsletter — nelle impostazioni delle notifiche o tramite il link nell’email.
- **Opposizione e limitazione** del trattamento basato sul legittimo interesse — su richiesta a {{privacyEmail}}.
- **Reclamo** all’autorità per la protezione dei dati del tuo paese.

Rispondiamo alle richieste entro un mese. Per proteggerti, potremmo chiederti di confermare la richiesta dal tuo account.

## 10. Minori

Il Servizio non è destinato a persone di età inferiore a {{minAge}}, e non raccogliamo consapevolmente i loro dati. Se vieni a sapere che esiste un account di questo tipo, comunicacelo e lo elimineremo.

## 11. Modifiche

Annunciamo le modifiche sostanziali in anticipo via email e nel Servizio. Se cambiano le finalità basate sul consenso, chiederemo di nuovo il consenso — nello stesso modo in cui il banner dei cookie lo richiede dopo un cambio di versione dell’informativa.

## 12. Contatti

- Domande sui dati: {{privacyEmail}}
- Domande generali: {{supportEmail}}
- Indirizzo postale: {{address}}
