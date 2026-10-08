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
- **Удаление**: «Настройки → Приватность → Удалить аккаунт». Профиль обезличивается («Удалённый пользователь»), контакты, сообщения агенту, сохранённые вакансии и уведомления удаляются, аккаунт входа удаляется; отклики остаются у работодателей без ваших контактов; компании, где вы единственный владелец, приостанавливаются.
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
- **Erasure**: Settings → Privacy → Delete account. The profile is anonymised ("Deleted user"); contacts, agent messages, saved jobs and notifications are deleted; the sign-in account is deleted; applications stay with employers without your contacts; companies where you are the only owner are suspended.
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
- **Eliminação**: Configurações → Privacidade → Excluir conta. O perfil é anonimizado ("Usuário excluído"); contatos, mensagens ao agente, vagas salvas e notificações são excluídos; a conta de login é excluída; as candidaturas ficam com os empregadores sem os seus contatos; empresas em que você é o único proprietário são suspensas.
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
- **Supresión**: Ajustes → Privacidad → Eliminar cuenta. El perfil se anonimiza («Usuario eliminado»); se eliminan los contactos, los mensajes con el agente, los empleos guardados y las notificaciones; se elimina la cuenta de inicio de sesión; las postulaciones quedan con los empleadores sin sus contactos; las empresas en las que usted es el único propietario se suspenden.
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
