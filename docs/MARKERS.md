# Маркеры вакансий: сферы, уровни, условия, навыки Web3 (D202)

Дополнение к ТЗ (разделы 4.1, 7, 8, 10, 11) по решению основателя 2026-10-04: вакансию можно отметить сферой (Web3, DeFi, ИИ, GameDev…), уровнем, условиями работы; в каталоге — фильтры и быстрые кнопки, как на крипто-досках. Подфаза **M1**, миграция `0019_*`, решения D202–D206.

## 1. Модель

| Что              | Где хранится                                                              | Сколько у вакансии | Кто задаёт                             |
| ---------------- | ------------------------------------------------------------------------- | ------------------ | -------------------------------------- |
| Категория (роль) | `jobs.category` — есть, расширяется (п. 2)                                | одна               | работодатель; импорт — по навыкам      |
| Сфера            | `jobs.sectors text[]` + CHECK по списку п. 3                              | 0–3                | работодатель; импорт — по словарю п. 7 |
| Уровень          | `jobs.seniority` — новый enum `job_seniority`                             | один или null      | работодатель; импорт — по заголовку    |
| Тип занятости    | `employment_type` — есть, добавить `freelance`, `internship`              | один               | работодатель                           |
| Условия          | `jobs.perks text[]` + CHECK по списку п. 5                                | 0–8                | работодатель                           |
| Навыки           | `skills` / `skills_aliases` — есть, добавить п. 6                         | как сейчас         | как сейчас (`normalizeSkill`)          |
| Предпочтения     | `candidate_preferences.sectors text[]`, `candidate_preferences.seniority` | —                  | кандидат в профиле                     |

Списки — константы в `src/config/markers.ts` (slug → ключ i18n), один источник для CHECK, zod, фильтров и форм. Тексты — верхний ключ `markers` в `en.json`/`ru.json`.

## 2. Категории (роль) — +4 к текущим 10

Есть: `engineering`, `data`, `design`, `product`, `marketing`, `sales`, `support`, `operations`, `finance`, `hr`.

Добавить:

| slug        | ru                       | en                  | теги источника                                                    |
| ----------- | ------------------------ | ------------------- | ----------------------------------------------------------------- |
| `legal`     | Юристы и комплаенс       | Legal & Compliance  | Legal, Compliance, Anti Money Laundering                          |
| `content`   | Контент и тексты         | Content & Writing   | Content, Content Writer, Copywriter, Technical Writer, Translator |
| `community` | Комьюнити и DevRel       | Community & DevRel  | Community, Developer Relations, Event Marketing                   |
| `research`  | Исследования и аналитика | Research & Analysis | Economist, Analyst, Quant, Venture Capital                        |

CHECK в `jobs` (миграция 0006) и категория навыка — расширить тем же списком.

## 3. Сферы (`sectors`, до 3)

**Web3** (группа отображается первой; «Web3» — общая метка, остальные — уточнения):

| slug           | ru                    | en                  | теги источника  |
| -------------- | --------------------- | ------------------- | --------------- |
| `web3`         | Web3 / блокчейн       | Web3                | Web3            |
| `defi`         | DeFi                  | DeFi                | DeFi            |
| `nft`          | NFT и цифровые активы | NFT                 | NFT             |
| `gamefi`       | GameFi                | GameFi              | GameFi          |
| `metaverse`    | Метавселенные         | Metaverse           | Metaverse       |
| `zk`           | Zero Knowledge        | Zero Knowledge      | Zero Knowledge  |
| `dao`          | DAO                   | DAO                 | —               |
| `infra-l1l2`   | Инфраструктура, L1/L2 | Infrastructure      | —               |
| `exchange`     | Биржи и трейдинг      | Exchanges & Trading | Trading         |
| `memecoins`    | Мемкоины              | Memecoins           | Memes           |
| `crypto-vc`    | Крипто-фонды          | Crypto VC           | Venture Capital |
| `eco-ethereum` | Экосистема Ethereum   | Ethereum            | Ethereum        |
| `eco-solana`   | Экосистема Solana     | Solana              | Solana          |
| `eco-fantom`   | Экосистема Fantom     | Fantom              | Fantom          |
| `eco-polkadot` | Экосистема Polkadot   | Polkadot            | Substrate       |

**ИИ и данные:** `ai-ml` (ИИ / ML), `genai` (Генеративный ИИ / LLM), `computer-vision`, `robotics`, `data-analytics`.
**Финансы:** `fintech`, `banking`, `payments`, `insurtech`, `quant-trading`, `accounting-tax`.
**Продукты и платформы:** `saas-b2b`, `devtools`, `cloud-infra`, `open-source`, `cybersecurity`, `ecommerce`, `marketplaces`, `adtech-martech`, `hr-tech`.
**Игры и медиа:** `gamedev`, `igaming` (ставки — вакансия уходит на ручную модерацию, D205), `ar-vr`, `media-streaming`, `creator-economy`, `music`.
**Здоровье и наука:** `healthtech`, `medtech`, `biotech`, `mental-health`, `fitness`.
**Общество:** `edtech`, `govtech`, `legaltech`, `nonprofit`, `climatetech`, `energy`.
**Реальный сектор:** `logistics`, `proptech`, `autotech`, `agritech`, `foodtech`, `travel`, `space`, `hardware-iot`, `telecom`.

Тексты ru/en для каждого slug — в `markers.sectors.*`; русские названия как в списке выше, английские — общепринятые (FinTech, GameDev, HealthTech…).

## 4. Уровень (`seniority`)

| slug         | ru             | en             | теги источника |
| ------------ | -------------- | -------------- | -------------- |
| `internship` | Стажировка     | Internship     | Internships    |
| `entry`      | Начальный      | Entry level    | Entry Level    |
| `mid`        | Средний        | Mid level      | —              |
| `senior`     | Старший        | Senior         | —              |
| `lead`       | Лид / менеджер | Lead / Manager | Manager        |

`employment_type`: добавить `freelance` (Freelance) и `internship` (стажировка как тип договора). Contract уже есть.

## 5. Условия (`perks`, бейджи на карточке)

`crypto-pay` (оплата в крипте), `token-equity` (токены или опцион), `async` (асинхронно), `four-day-week` (4-дневка), `visa-support` (помощь с визой), `relocation` (релокация), `no-degree` (без диплома), `junior-friendly` (подходит джунам), `own-timezone` (в своём часовом поясе).

## 6. Навыки — добавить в справочник (+ алиасы)

Есть и не трогаем: React, Rust, C++ (`cpp`), Java, Ruby, Kubernetes, Machine Learning, Python, Go, TypeScript, Figma, UI/UX (`uidesign`, `uxdesign`), Copywriting, Recruiting.

Новые (slug — en / ru — категория — алиасы):

| slug                  | en / ru                                     | категория   | алиасы                                          |
| --------------------- | ------------------------------------------- | ----------- | ----------------------------------------------- |
| `solidity`            | Solidity                                    | engineering | sol                                             |
| `smartcontracts`      | Smart Contracts / Смарт-контракты           | engineering | smart contract, smart-contracts                 |
| `zkproofs`            | Zero-Knowledge Proofs / ZK-доказательства   | engineering | zk, zero knowledge, zkp, zk-snarks              |
| `substrate`           | Substrate                                   | engineering | polkadot sdk                                    |
| `evm`                 | EVM                                         | engineering | ethereum virtual machine                        |
| `anchor`              | Anchor (Solana)                             | engineering | solana anchor                                   |
| `web3js`              | web3.js / ethers.js                         | engineering | ethers, ethersjs, web3                          |
| `ios`                 | iOS                                         | engineering | swift, swiftui                                  |
| `django`              | Django                                      | engineering | —                                               |
| `rubyonrails`         | Ruby on Rails                               | engineering | rails, ror                                      |
| `sre`                 | Site Reliability Engineering / SRE          | engineering | site reliability, devops sre                    |
| `fullstack`           | Full-stack / Фулстек                        | engineering | full stack, full-stack developer                |
| `technicalwriting`    | Technical Writing / Техническое письмо      | content     | technical writer, docs                          |
| `translation`         | Translation / Переводы                      | content     | translator, localization                        |
| `contentwriting`      | Content Writing / Контент                   | content     | content writer                                  |
| `memes`               | Meme Marketing / Мемы                       | marketing   | memes, meme                                     |
| `eventmarketing`      | Event Marketing / Ивент-маркетинг           | marketing   | events                                          |
| `communitymanagement` | Community Management / Комьюнити-менеджмент | community   | community manager, discord, telegram moderation |
| `devrel`              | Developer Relations / DevRel                | community   | developer advocate, devrel                      |
| `compliance`          | Compliance / Комплаенс                      | legal       | regulatory                                      |
| `aml`                 | AML / KYC                                   | legal       | anti money laundering, kyc                      |
| `cryptolaw`           | Crypto Law / Крипто-право                   | legal       | —                                               |
| `tokenomics`          | Tokenomics / Токеномика                     | research    | token economics                                 |
| `economics`           | Economics / Экономика                       | research    | economist                                       |
| `quant`               | Quantitative Analysis / Квант-анализ        | research    | quant, quantitative                             |
| `trading`             | Trading / Трейдинг                          | research    | market making                                   |
| `venturecapital`      | Venture Capital / Венчур                    | research    | vc                                              |
| `dataanalysis`        | Data Analysis / Анализ данных               | data        | data analyst                                    |

## 7. Каталог `/jobs` (раздел 8, DESIGN 9.2)

- Фильтры в колонке: «Сфера» (мультивыбор, группы как в п. 3, Web3 первой), «Уровень», «Тип занятости» (+ freelance, internship), «Условия». Параметры URL: `sector=`, `seniority=`, `perk=` (повторяемые).
- **Быстрые кнопки** над списком (горизонтальная лента чипов, как теги крипто-досок) — это ссылки-пресеты фильтров, данных не добавляют:
  - «Для вас» → `/matches` (только кандидату; гостю — `/login`).
  - «Удалённо» → `workFormat=remote`. «Не технические» → все категории, кроме `engineering` и `data`.
  - Сферы: Web3, DeFi, NFT, GameFi, ZK, Metaverse, Ethereum, Solana, Memes, Trading.
  - Роли: Разработка, Дизайн, Маркетинг, Комьюнити, Юристы, Контент, Данные, HR.
  - Навыки: Solidity, Rust, React, Smart Contracts.
  - Уровень/тип: Стажировки, Начальный уровень, Фриланс, Контракт.
    Набор кнопок — константа в `src/config/markers.ts`, порядок задаёт основатель.
- Карточка (DESIGN 8.5): до 2 сфер как `Badge` в ряду меток, условия — до 3 бейджей; уровень — в телеметрии.
- Страница вакансии: все сферы и условия.

## 8. Работодатель, кандидат, импорт

- Форма вакансии: «Сферы» (до 3), «Уровень», «Условия». Необязательные.
- Профиль кандидата, «Предпочтения»: «Интересные сферы» (до 5) и желаемый уровень.
- Импорт (8A): сферы и уровень — по словарю ключевых слов из заголовка, тегов и описания источника (Web3, DeFi, Solidity → `web3`…; Intern/Junior/Senior/Lead → уровень). Не распознано — пусто.

## 9. Подбор (раздел 10) — D203

- Hard-фильтров не добавляется.
- Сфера: если `job.sectors ∩ candidate.sectors` не пусто, компонент role/title = `max(·, 0.7)` (так же, как совпадение категории); explain — `explain.role.sector`.
- Уровень: если у кандидата задан желаемый уровень и он отличается от уровня вакансии больше чем на одну ступень — множитель `×0.9`, explain `partial`.
- `algo_version` +1 (кэш пересчитывается сам).

## 10. Модерация — D205

`igaming` и `memecoins` — вакансия уходит в `pending_moderation` даже у verified-компании (риск-флаг `sensitive_sector`, +2 балла в 14.3). Слово «гарантированный доход» и т.п. уже ловит scam-фильтр.

## 11. Решения и тесты

- D202 — модель маркеров (этот документ). D203 — подбор. D204 — каталог и пресеты. D205 — модерация сфер. D206 — резерв.
- Unit: CHECK-списки совпадают с `markers.ts`; zod; словарь импорта; формула п. 9.
- Интеграция: фильтр `sector=web3` в `GET /api/jobs` (p95 < 500 ms на seed 5k — GIN-индекс по `sectors`); совпадение сферы поднимает score.
- e2e: работодатель ставит сферу Web3 и условие «оплата в крипте» → карточка с бейджами; кнопка «Web3» в каталоге оставляет только такие вакансии; 360 px без горизонтальной прокрутки.
- Зависит от: 6B в `master` (файлы подбора), не пересекается с 7B/9B (бот, дайджест) и 11B (метрики, RUNBOOK).
