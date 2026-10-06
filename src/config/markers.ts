/**
 * Job markers (D202, MARKERS.md). One list for CHECK constraints, zod,
 * catalog filters, tag pages and forms.
 */

export const JOB_CATEGORIES = [
  "engineering",
  "data",
  "design",
  "product",
  "marketing",
  "sales",
  "support",
  "operations",
  "finance",
  "hr",
  "legal",
  "content",
  "community",
  "research",
] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "freelance",
  "internship",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SENIORITY_LEVELS = [
  "internship",
  "entry",
  "mid",
  "senior",
  "lead",
] as const;
export type Seniority = (typeof SENIORITY_LEVELS)[number];

/** Role score floor when a job sector is also a candidate sector (D203). */
export const SECTOR_ROLE_FLOOR = 0.7;
/** Applied when desired and job seniority differ by more than one step. */
export const SENIORITY_MULTIPLIER = 0.9;
/** Whole US dollars per year. Minor units are derived for USD (2 digits). */
export const HIGH_PAY_USD_YEAR = 100_000;
export const MAX_JOB_SECTORS = 3;
export const MAX_CANDIDATE_SECTORS = 5;
export const MAX_JOB_PERKS = 8;
/** Chips kept outside «Show more» — about two desktop rows. */
export const QUICK_FILTER_VISIBLE = 12;

export const PERKS = [
  "crypto-pay",
  "token-equity",
  "async",
  "four-day-week",
  "visa-support",
  "relocation",
  "no-degree",
  "junior-friendly",
  "own-timezone",
] as const;
export type Perk = (typeof PERKS)[number];

export const SENSITIVE_SECTORS = ["igaming", "memecoins"] as const;

const web3 = [
  "web3",
  "defi",
  "nft",
  "gamefi",
  "metaverse",
  "zk",
  "dao",
  "infra-l1l2",
  "exchange",
  "memecoins",
  "crypto-vc",
  "eco-ethereum",
  "eco-solana",
  "eco-fantom",
  "eco-polkadot",
] as const;

const ai = [
  "ai-ml",
  "genai",
  "computer-vision",
  "robotics",
  "data-analytics",
] as const;

const finance = [
  "fintech",
  "banking",
  "payments",
  "insurtech",
  "quant-trading",
  "accounting-tax",
] as const;

const products = [
  "saas-b2b",
  "devtools",
  "cloud-infra",
  "open-source",
  "cybersecurity",
  "ecommerce",
  "marketplaces",
  "adtech-martech",
  "hr-tech",
] as const;

const games = [
  "gamedev",
  "igaming",
  "ar-vr",
  "media-streaming",
  "creator-economy",
  "music",
] as const;

const health = [
  "healthtech",
  "medtech",
  "biotech",
  "mental-health",
  "fitness",
] as const;

const society = [
  "edtech",
  "govtech",
  "legaltech",
  "nonprofit",
  "climatetech",
  "energy",
] as const;

const industry = [
  "logistics",
  "proptech",
  "autotech",
  "agritech",
  "foodtech",
  "travel",
  "space",
  "hardware-iot",
  "telecom",
] as const;

export const SECTOR_GROUPS = [
  { id: "web3", sectors: web3 },
  { id: "ai", sectors: ai },
  { id: "finance", sectors: finance },
  { id: "products", sectors: products },
  { id: "games", sectors: games },
  { id: "health", sectors: health },
  { id: "society", sectors: society },
  { id: "industry", sectors: industry },
] as const;

export const SECTORS = SECTOR_GROUPS.flatMap((group) => group.sectors);
export type Sector = (typeof SECTORS)[number];

export function isSector(value: string): value is Sector {
  return (SECTORS as readonly string[]).includes(value);
}

export function isSensitiveSector(sectors: readonly string[]): boolean {
  return sectors.some((sector) =>
    (SENSITIVE_SECTORS as readonly string[]).includes(sector),
  );
}

/** Web3 sectors stay ahead of the others when a card shows two badges. */
export function sectorsForCard(
  sectors: readonly string[],
  limit = 2,
): string[] {
  const known = sectors.filter(isSector);
  const first = known.filter((sector) =>
    (web3 as readonly string[]).includes(sector),
  );
  const rest = known.filter(
    (sector) => !(web3 as readonly string[]).includes(sector),
  );
  return [...first, ...rest].slice(0, limit);
}

export function seniorityStepsApart(left: Seniority, right: Seniority): number {
  return Math.abs(
    SENIORITY_LEVELS.indexOf(left) - SENIORITY_LEVELS.indexOf(right),
  );
}

export function seniorityPenalty(
  candidate: string | null | undefined,
  job: string | null | undefined,
): number {
  if (!candidate || !job) return 1;
  if (
    !(SENIORITY_LEVELS as readonly string[]).includes(candidate) ||
    !(SENIORITY_LEVELS as readonly string[]).includes(job)
  ) {
    return 1;
  }
  return seniorityStepsApart(candidate as Seniority, job as Seniority) > 1
    ? SENIORITY_MULTIPLIER
    : 1;
}

export type MarkerSkill = {
  slug: string;
  nameEn: string;
  nameRu: string;
  category: JobCategory;
  /** Lookup keys already passed through normalizeSkillText. */
  aliases: readonly string[];
};

/** Slugs follow MARKERS.md. Lookup keys match normalizeSkillText (D42, D206). */
export const MARKER_SKILLS: readonly MarkerSkill[] = [
  {
    slug: "solidity",
    nameEn: "Solidity",
    nameRu: "Solidity",
    category: "engineering",
    aliases: ["solidity", "sol"],
  },
  {
    slug: "smartcontracts",
    nameEn: "Smart Contracts",
    nameRu: "Смарт-контракты",
    category: "engineering",
    aliases: ["smartcontracts", "smartcontract"],
  },
  {
    slug: "zkproofs",
    nameEn: "Zero-Knowledge Proofs",
    nameRu: "ZK-доказательства",
    category: "engineering",
    aliases: [
      "zkproofs",
      "zeroknowledgeproofs",
      "zk",
      "zeroknowledge",
      "zkp",
      "zksnarks",
    ],
  },
  {
    slug: "substrate",
    nameEn: "Substrate",
    nameRu: "Substrate",
    category: "engineering",
    aliases: ["substrate", "polkadotsdk"],
  },
  {
    slug: "evm",
    nameEn: "EVM",
    nameRu: "EVM",
    category: "engineering",
    aliases: ["evm", "ethereumvirtualmachine"],
  },
  {
    slug: "anchor",
    nameEn: "Anchor",
    nameRu: "Anchor (Solana)",
    category: "engineering",
    aliases: ["anchor", "solanaanchor"],
  },
  {
    slug: "web3js",
    nameEn: "web3.js",
    nameRu: "web3.js / ethers.js",
    category: "engineering",
    aliases: ["web3js", "web3", "ethers"],
  },
  {
    slug: "ios",
    nameEn: "iOS",
    nameRu: "iOS",
    category: "engineering",
    aliases: ["ios", "swift", "swiftui"],
  },
  {
    slug: "django",
    nameEn: "Django",
    nameRu: "Django",
    category: "engineering",
    aliases: ["django", "djangorest"],
  },
  {
    slug: "rubyonrails",
    nameEn: "Ruby on Rails",
    nameRu: "Ruby on Rails",
    category: "engineering",
    aliases: ["rubyonrails", "rails", "ror"],
  },
  {
    slug: "sre",
    nameEn: "Site Reliability Engineering",
    nameRu: "SRE",
    category: "engineering",
    aliases: ["sre", "sitereliability", "sitereliabilityengineering"],
  },
  {
    slug: "fullstack",
    nameEn: "Full-stack",
    nameRu: "Фулстек",
    category: "engineering",
    aliases: ["fullstack", "fullstackdeveloper"],
  },
  {
    slug: "technicalwriting",
    nameEn: "Technical Writing",
    nameRu: "Техническое письмо",
    category: "content",
    aliases: ["technicalwriting", "technicalwriter", "docs"],
  },
  {
    slug: "translation",
    nameEn: "Translation",
    nameRu: "Переводы",
    category: "content",
    aliases: ["translation", "translator", "localization"],
  },
  {
    slug: "contentwriting",
    nameEn: "Content Writing",
    nameRu: "Контент",
    category: "content",
    aliases: ["contentwriting", "contentwriter"],
  },
  {
    slug: "memes",
    nameEn: "Meme Marketing",
    nameRu: "Мемы",
    category: "marketing",
    aliases: ["memes", "meme", "mememarketing"],
  },
  {
    slug: "eventmarketing",
    nameEn: "Event Marketing",
    nameRu: "Ивент-маркетинг",
    category: "marketing",
    aliases: ["eventmarketing", "events"],
  },
  {
    slug: "communitymanagement",
    nameEn: "Community Management",
    nameRu: "Комьюнити-менеджмент",
    category: "community",
    aliases: ["communitymanagement", "communitymanager", "discord"],
  },
  {
    slug: "devrel",
    nameEn: "Developer Relations",
    nameRu: "DevRel",
    category: "community",
    aliases: ["devrel", "developeradvocate"],
  },
  {
    slug: "compliance",
    nameEn: "Compliance",
    nameRu: "Комплаенс",
    category: "legal",
    aliases: ["compliance", "regulatory"],
  },
  {
    slug: "aml",
    nameEn: "AML / KYC",
    nameRu: "AML / KYC",
    category: "legal",
    aliases: ["aml", "amlkyc", "antimoneylaundering", "kyc"],
  },
  {
    slug: "cryptolaw",
    nameEn: "Crypto Law",
    nameRu: "Крипто-право",
    category: "legal",
    aliases: ["cryptolaw", "cryptoregulation"],
  },
  {
    slug: "tokenomics",
    nameEn: "Tokenomics",
    nameRu: "Токеномика",
    category: "research",
    aliases: ["tokenomics", "tokeneconomics"],
  },
  {
    slug: "economics",
    nameEn: "Economics",
    nameRu: "Экономика",
    category: "research",
    aliases: ["economics", "economist"],
  },
  {
    slug: "quant",
    nameEn: "Quantitative Analysis",
    nameRu: "Квант-анализ",
    category: "research",
    aliases: ["quant", "quantitativeanalysis"],
  },
  {
    slug: "trading",
    nameEn: "Trading",
    nameRu: "Трейдинг",
    category: "research",
    aliases: ["trading", "marketmaking"],
  },
  {
    slug: "venturecapital",
    nameEn: "Venture Capital",
    nameRu: "Венчур",
    category: "research",
    aliases: ["venturecapital", "vc"],
  },
  {
    slug: "dataanalysis",
    nameEn: "Data Analysis",
    nameRu: "Анализ данных",
    category: "data",
    aliases: ["dataanalysis", "dataanalyst"],
  },
];

const sectorKeywords: ReadonlyArray<readonly [Sector, RegExp]> = [
  ["defi", /\bdefi\b|decentrali[sz]ed finance/i],
  ["nft", /\bnft\b|non-fungible/i],
  ["gamefi", /\bgamefi\b/i],
  ["metaverse", /\bmetaverse\b/i],
  ["zk", /\bzero[\s-]?knowledge\b|\bzk\b/i],
  ["dao", /\bdao\b/i],
  ["exchange", /\bexchange\b|\btrading\b/i],
  ["memecoins", /\bmemecoin\b|\bmemes?\b/i],
  ["crypto-vc", /venture capital/i],
  ["eco-ethereum", /\bethereum\b/i],
  ["eco-solana", /\bsolana\b/i],
  ["eco-fantom", /\bfantom\b/i],
  ["eco-polkadot", /\bpolkadot\b|\bsubstrate\b/i],
  ["web3", /\bweb3\b|\bblockchain\b|\bsolidity\b/i],
  ["ai-ml", /\bmachine learning\b|\bai\b|\bartificial intelligence\b/i],
  ["genai", /\bllm\b|generative ai/i],
  ["gamedev", /\bgamedev\b|game dev/i],
  ["igaming", /\bigaming\b|\bbetting\b|\bgambling\b/i],
  ["fintech", /\bfintech\b/i],
];

const seniorityKeywords: ReadonlyArray<readonly [Seniority, RegExp]> = [
  ["internship", /\bintern(ship)?\b|стаж[её]р/i],
  ["entry", /\bjunior\b|\bentry[\s-]?level\b/i],
  ["lead", /\blead\b|\bprincipal\b|\bhead of\b|\bmanager\b/i],
  ["senior", /\bsenior\b|\bsr\.?\b/i],
  ["mid", /\bmid[\s-]?level\b|\bmiddle\b/i],
];

const categoryKeywords: ReadonlyArray<readonly [JobCategory, RegExp]> = [
  ["legal", /\blegal\b|\bcompliance\b|anti money laundering|\baml\b/i],
  ["content", /\bcontent\b|\bcopywriter\b|technical writer|\btranslator\b/i],
  [
    "community",
    /\bcommunity\b|developer relations|\bdevrel\b|event marketing/i,
  ],
  ["research", /\beconomist\b|\banalyst\b|\bquant\b|venture capital/i],
];

/** Sectors (max 3), seniority and category inferred from import text (MARKERS.md 8). */
export function inferImportedMarkers(text: string): {
  sectors: Sector[];
  seniority: Seniority | null;
  category: JobCategory | null;
} {
  const sectors: Sector[] = [];
  for (const [sector, pattern] of sectorKeywords) {
    if (sectors.length >= MAX_JOB_SECTORS) break;
    if (pattern.test(text) && !sectors.includes(sector)) sectors.push(sector);
  }
  let seniority: Seniority | null = null;
  for (const [level, pattern] of seniorityKeywords) {
    if (pattern.test(text)) {
      seniority = level;
      break;
    }
  }
  let category: JobCategory | null = null;
  for (const [value, pattern] of categoryKeywords) {
    if (pattern.test(text)) {
      category = value;
      break;
    }
  }
  return { sectors, seniority, category };
}

/**
 * Working-hours regions for collection pages (D295). A region is one
 * representative IANA zone plus the hours of overlap a job must share with it,
 * so the filter is the existing `tzOverlapWith` and nothing new in the schema.
 */
export type Region = {
  slug: string;
  timezone: string;
  minOverlap: number;
};

export const REGIONS: readonly Region[] = [
  { slug: "europe", timezone: "Europe/Berlin", minOverlap: 4 },
  { slug: "north-america", timezone: "America/New_York", minOverlap: 4 },
  { slug: "latam", timezone: "America/Bogota", minOverlap: 4 },
  { slug: "apac", timezone: "Asia/Singapore", minOverlap: 4 },
  { slug: "africa-mena", timezone: "Africa/Lagos", minOverlap: 4 },
];

export function region(slug: string): Region | null {
  return REGIONS.find((item) => item.slug === slug) ?? null;
}

export type CatalogTag =
  | { slug: string; kind: "sector"; sector: Sector }
  | { slug: string; kind: "category"; category: JobCategory }
  | { slug: string; kind: "skill"; skillSlug: string }
  | { slug: string; kind: "seniority"; seniority: Seniority }
  | { slug: string; kind: "employment"; employment: EmploymentType }
  | { slug: string; kind: "region"; region: Region }
  | { slug: string; kind: "remote" }
  | { slug: string; kind: "non-technical" }
  | { slug: string; kind: "high-paying" }
  | { slug: string; kind: "for-you" };

function sectorTag(sector: Sector): CatalogTag {
  return { slug: sector, kind: "sector", sector };
}

/** Founder order (MARKERS.md 7). «For you» is first and is not a filter. */
export const QUICK_FILTERS: readonly CatalogTag[] = [
  { slug: "for-you", kind: "for-you" },
  { slug: "remote", kind: "remote" },
  { slug: "non-technical", kind: "non-technical" },
  sectorTag("web3"),
  sectorTag("defi"),
  sectorTag("nft"),
  sectorTag("gamefi"),
  sectorTag("zk"),
  sectorTag("metaverse"),
  sectorTag("eco-ethereum"),
  sectorTag("eco-solana"),
  sectorTag("memecoins"),
  sectorTag("exchange"),
  { slug: "engineering", kind: "category", category: "engineering" },
  { slug: "design", kind: "category", category: "design" },
  { slug: "marketing", kind: "category", category: "marketing" },
  { slug: "community", kind: "category", category: "community" },
  { slug: "legal", kind: "category", category: "legal" },
  { slug: "content", kind: "category", category: "content" },
  { slug: "data", kind: "category", category: "data" },
  { slug: "hr", kind: "category", category: "hr" },
  { slug: "solidity", kind: "skill", skillSlug: "solidity" },
  { slug: "rust", kind: "skill", skillSlug: "rust" },
  { slug: "react", kind: "skill", skillSlug: "react" },
  { slug: "smartcontracts", kind: "skill", skillSlug: "smartcontracts" },
  { slug: "internship", kind: "seniority", seniority: "internship" },
  { slug: "entry", kind: "seniority", seniority: "entry" },
  { slug: "mid", kind: "seniority", seniority: "mid" },
  { slug: "senior", kind: "seniority", seniority: "senior" },
  { slug: "lead", kind: "seniority", seniority: "lead" },
  { slug: "freelance", kind: "employment", employment: "freelance" },
  { slug: "contract", kind: "employment", employment: "contract" },
  { slug: "full-time", kind: "employment", employment: "full_time" },
  { slug: "part-time", kind: "employment", employment: "part_time" },
  { slug: "high-paying", kind: "high-paying" },
];

const extraSectorTags: CatalogTag[] = SECTORS.filter(
  (sector) => !QUICK_FILTERS.some((tag) => tag.slug === sector),
).map((sector) => sectorTag(sector));

const extraCategoryTags: CatalogTag[] = JOB_CATEGORIES.filter(
  (category) => !QUICK_FILTERS.some((tag) => tag.slug === category),
).map((category) => ({ slug: category, kind: "category", category }));

const taken = new Set<string>([
  ...QUICK_FILTERS.map((tag) => tag.slug),
  ...extraSectorTags.map((tag) => tag.slug),
  ...extraCategoryTags.map((tag) => tag.slug),
]);

/** Every marker skill gets a collection page, not only the quick filters (D294). */
const extraSkillTags: CatalogTag[] = MARKER_SKILLS.filter(
  (skill) => !taken.has(skill.slug),
).map((skill) => ({ slug: skill.slug, kind: "skill", skillSlug: skill.slug }));

const regionTags: CatalogTag[] = REGIONS.filter(
  (item) => !taken.has(item.slug),
).map((item) => ({ slug: item.slug, kind: "region", region: item }));

export const CATALOG_TAGS: readonly CatalogTag[] = [
  ...QUICK_FILTERS,
  ...extraSectorTags,
  ...extraCategoryTags,
  ...extraSkillTags,
  ...regionTags,
];

export function catalogTag(slug: string): CatalogTag | null {
  return CATALOG_TAGS.find((tag) => tag.slug === slug) ?? null;
}

export function sqlTextList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(", ");
}
