import type { SkillCategory } from "@/modules/taxonomy/schemas";
import {
  normalizeSkillText,
  toAliasNormalized,
} from "@/modules/taxonomy/service/normalize-skill-text";

export type SkillSeed = {
  nameEn: string;
  nameRu: string;
  category: SkillCategory;
  aliases: readonly [string, string, ...string[]];
};

export type ExpandedSkill = {
  slug: string;
  nameEn: string;
  nameRu: string;
  category: SkillCategory;
  aliases: string[];
};

function skill(
  nameEn: string,
  nameRu: string,
  category: SkillCategory,
  aliases: readonly [string, string, ...string[]],
): SkillSeed {
  return { nameEn, nameRu, category, aliases };
}

export const SKILL_CATALOG: readonly SkillSeed[] = [
  skill("JavaScript", "JavaScript", "engineering", [
    "JavaScript",
    "JS",
    "ECMAScript",
  ]),
  skill("TypeScript", "TypeScript", "engineering", ["TypeScript", "TS"]),
  skill("React", "React", "engineering", ["React", "ReactJS"]),
  skill("Vue.js", "Vue.js", "engineering", ["Vue.js", "VueJS"]),
  skill("Angular", "Angular", "engineering", ["Angular", "Angular Framework"]),
  skill("Next.js", "Next.js", "engineering", ["Next.js", "NextJS"]),
  skill("Node.js", "Node.js", "engineering", ["Node.js", "NodeJS"]),
  skill("Python", "Python", "engineering", ["Python", "Python Language"]),
  skill("Java", "Java", "engineering", ["Java", "Java SE"]),
  skill("Kotlin", "Kotlin", "engineering", ["Kotlin", "Kotlin Language"]),
  skill("Go", "Go", "engineering", ["Go", "Golang"]),
  skill("Rust", "Rust", "engineering", ["Rust", "Rust Language"]),
  skill("C#", "C#", "engineering", ["C#", "C Sharp Language"]),
  skill("C++", "C++", "engineering", ["C++", "C Plus Plus"]),
  skill("PHP", "PHP", "engineering", ["PHP", "PHP Language"]),
  skill("Ruby", "Ruby", "engineering", ["Ruby", "Ruby Language"]),
  skill("Docker", "Docker", "engineering", ["Docker", "Docker Engine"]),
  skill("Kubernetes", "Kubernetes", "engineering", ["Kubernetes", "K8s"]),
  skill("AWS", "AWS", "engineering", ["AWS", "Amazon Web Services"]),
  skill("Git", "Git", "engineering", ["Git", "Git Version Control"]),

  skill("SQL", "SQL", "data", ["SQL", "Structured Query Language"]),
  skill("PostgreSQL", "PostgreSQL", "data", ["PostgreSQL", "Postgres"]),
  skill("MySQL", "MySQL", "data", ["MySQL", "MySQL Database"]),
  skill("MongoDB", "MongoDB", "data", ["MongoDB", "Mongo"]),
  skill("Redis", "Redis", "data", ["Redis", "Redis Database"]),
  skill("Apache Spark", "Apache Spark", "data", ["Apache Spark", "Spark"]),
  skill("Apache Airflow", "Apache Airflow", "data", [
    "Apache Airflow",
    "Airflow",
  ]),
  skill("Tableau", "Tableau", "data", ["Tableau", "Tableau Desktop"]),
  skill("Machine Learning", "Машинное обучение", "data", [
    "Machine Learning",
    "ML",
  ]),
  skill("Pandas", "Pandas", "data", ["Pandas", "Pandas Library"]),

  skill("Figma", "Figma", "design", ["Figma", "Figma Design"]),
  skill("Sketch", "Sketch", "design", ["Sketch", "Sketch App"]),
  skill("Adobe XD", "Adobe XD", "design", [
    "Adobe XD",
    "Adobe Experience Design",
  ]),
  skill("Photoshop", "Photoshop", "design", ["Photoshop", "Adobe Photoshop"]),
  skill("Illustrator", "Illustrator", "design", [
    "Illustrator",
    "Adobe Illustrator",
  ]),
  skill("UI Design", "UI-дизайн", "design", [
    "UI Design",
    "User Interface Design",
  ]),
  skill("UX Design", "UX-дизайн", "design", [
    "UX Design",
    "User Experience Design",
  ]),
  skill("Design Systems", "Дизайн-системы", "design", [
    "Design Systems",
    "Design System",
  ]),
  skill("Prototyping", "Прототипирование", "design", [
    "Prototyping",
    "Interactive Prototype",
  ]),
  skill("Usability", "Юзабилити", "design", ["Usability", "Usability Testing"]),

  skill("Product Management", "Продакт-менеджмент", "product", [
    "Product Management",
    "Product Manager",
  ]),
  skill("Roadmapping", "Дорожные карты продукта", "product", [
    "Roadmapping",
    "Product Roadmap",
  ]),
  skill("Agile", "Agile", "product", ["Agile", "Agile Methodology"]),
  skill("Scrum", "Scrum", "product", ["Scrum", "Scrum Framework"]),
  skill("Kanban", "Канбан", "product", ["Kanban", "Kanban Method"]),
  skill("Jira", "Jira", "product", ["Jira", "Jira Software"]),
  skill("Confluence", "Confluence", "product", [
    "Confluence",
    "Atlassian Confluence",
  ]),
  skill("Product Analytics", "Продуктовая аналитика", "product", [
    "Product Analytics",
    "Product Metrics",
  ]),
  skill("A/B Testing", "A/B-тестирование", "product", [
    "A/B Testing",
    "Split Testing",
  ]),
  skill("User Research", "Исследования пользователей", "product", [
    "User Research",
    "Customer Research",
  ]),

  skill("SEO", "Поисковая оптимизация", "marketing", [
    "SEO",
    "Search Engine Optimization",
  ]),
  skill("Content Marketing", "Контент-маркетинг", "marketing", [
    "Content Marketing",
    "Content Marketing Strategy",
  ]),
  skill("Copywriting", "Копирайтинг", "marketing", [
    "Copywriting",
    "Marketing Copy",
  ]),
  skill("Email Marketing", "Email-маркетинг", "marketing", [
    "Email Marketing",
    "Email Campaigns",
  ]),
  skill("Social Media Marketing", "Маркетинг в социальных сетях", "marketing", [
    "Social Media Marketing",
    "SMM",
  ]),
  skill("Google Analytics", "Google Analytics", "marketing", [
    "Google Analytics",
    "GA4",
  ]),
  skill("Google Ads", "Google Ads", "marketing", [
    "Google Ads",
    "Google AdWords",
  ]),
  skill("Brand Management", "Управление брендом", "marketing", [
    "Brand Management",
    "Branding",
  ]),
  skill("Conversion Optimization", "Оптимизация конверсии", "marketing", [
    "Conversion Optimization",
    "CRO",
  ]),
  skill("Marketing Automation", "Автоматизация маркетинга", "marketing", [
    "Marketing Automation",
    "Marketing Automation Platform",
  ]),

  skill("Sales", "Продажи", "sales", ["Sales", "Selling"]),
  skill("B2B Sales", "B2B-продажи", "sales", [
    "B2B Sales",
    "Business to Business Sales",
  ]),
  skill("CRM", "CRM", "sales", ["CRM", "Customer Relationship Management"]),
  skill("Salesforce", "Salesforce", "sales", ["Salesforce", "SFDC"]),
  skill("HubSpot", "HubSpot", "sales", ["HubSpot", "HubSpot CRM"]),
  skill("Negotiation", "Переговоры", "sales", [
    "Negotiation",
    "Sales Negotiation",
  ]),
  skill("Lead Generation", "Лидогенерация", "sales", [
    "Lead Generation",
    "Lead Gen",
  ]),
  skill("Account Management", "Ведение ключевых клиентов", "sales", [
    "Account Management",
    "Key Account Management",
  ]),

  skill("Customer Support", "Поддержка клиентов", "support", [
    "Customer Support",
    "Customer Service",
  ]),
  skill("Customer Success", "Сопровождение клиентов", "support", [
    "Customer Success",
    "Client Success",
  ]),
  skill("Zendesk", "Zendesk", "support", ["Zendesk", "Zendesk Support"]),
  skill("Intercom", "Intercom", "support", ["Intercom", "Intercom Support"]),
  skill("Help Desk", "Служба поддержки", "support", [
    "Help Desk",
    "Service Desk",
  ]),
  skill("Troubleshooting", "Поиск и устранение неисправностей", "support", [
    "Troubleshooting",
    "Fault Diagnosis",
  ]),
  skill("Service Level Agreements", "Соглашения об уровне сервиса", "support", [
    "Service Level Agreements",
    "SLA",
  ]),
  skill("Customer Onboarding", "Онбординг клиентов", "support", [
    "Customer Onboarding",
    "Client Onboarding",
  ]),

  skill("Project Management", "Управление проектами", "operations", [
    "Project Management",
    "Project Manager",
  ]),
  skill("Operations Management", "Операционный менеджмент", "operations", [
    "Operations Management",
    "Business Operations",
  ]),
  skill("Supply Chain", "Управление цепочкой поставок", "operations", [
    "Supply Chain",
    "Supply Chain Management",
  ]),
  skill("Logistics", "Логистика", "operations", [
    "Logistics",
    "Logistics Management",
  ]),
  skill("Process Improvement", "Улучшение процессов", "operations", [
    "Process Improvement",
    "Continuous Improvement",
  ]),
  skill("Vendor Management", "Управление поставщиками", "operations", [
    "Vendor Management",
    "Supplier Management",
  ]),
  skill("Procurement", "Закупки", "operations", ["Procurement", "Purchasing"]),
  skill("Lean", "Бережливое производство", "operations", [
    "Lean",
    "Lean Operations",
  ]),

  skill("Accounting", "Бухгалтерский учёт", "finance", [
    "Accounting",
    "Financial Accounting",
  ]),
  skill("Bookkeeping", "Ведение учёта", "finance", [
    "Bookkeeping",
    "Double Entry Bookkeeping",
  ]),
  skill("Financial Analysis", "Финансовый анализ", "finance", [
    "Financial Analysis",
    "Financial Statement Analysis",
  ]),
  skill("Budgeting", "Бюджетирование", "finance", [
    "Budgeting",
    "Budget Planning",
  ]),
  skill("FP&A", "Финансовое планирование и анализ", "finance", [
    "FP&A",
    "Financial Planning and Analysis",
  ]),
  skill("QuickBooks", "QuickBooks", "finance", [
    "QuickBooks",
    "QuickBooks Online",
  ]),
  skill("Tax", "Налоги", "finance", ["Tax", "Taxation"]),
  skill("Payroll", "Расчёт заработной платы", "finance", [
    "Payroll",
    "Payroll Processing",
  ]),

  skill("Recruiting", "Подбор персонала", "hr", ["Recruiting", "Recruitment"]),
  skill("Talent Sourcing", "Сорсинг кандидатов", "hr", [
    "Talent Sourcing",
    "Candidate Sourcing",
  ]),
  skill("Interviewing", "Проведение собеседований", "hr", [
    "Interviewing",
    "Candidate Interviews",
  ]),
  skill("Employee Onboarding", "Адаптация сотрудников", "hr", [
    "Employee Onboarding",
    "New Hire Onboarding",
  ]),
  skill("Employee Relations", "Трудовые отношения", "hr", [
    "Employee Relations",
    "Staff Relations",
  ]),
  skill("Compensation", "Компенсации и льготы", "hr", [
    "Compensation",
    "Compensation and Benefits",
  ]),
  skill("HRIS", "Кадровые информационные системы", "hr", [
    "HRIS",
    "Human Resource Information System",
  ]),
  skill("People Operations", "Операционное управление персоналом", "hr", [
    "People Operations",
    "People Ops",
  ]),
];

export function expandCatalog(
  catalog: readonly SkillSeed[] = SKILL_CATALOG,
): ExpandedSkill[] {
  const expanded: ExpandedSkill[] = [];
  const errors: string[] = [];
  const slugSeen = new Set<string>();

  for (const entry of catalog) {
    const slug = normalizeSkillText(entry.nameEn);
    if (!slug) errors.push(`empty slug for ${entry.nameEn}`);
    if (slugSeen.has(slug)) errors.push(`duplicate slug ${slug}`);
    slugSeen.add(slug);

    const aliases: string[] = [];
    const seen = new Set<string>();
    for (const raw of entry.aliases) {
      const alias = toAliasNormalized(raw);
      if (!alias) {
        errors.push(`empty alias "${raw}" on ${slug}`);
        continue;
      }
      if (seen.has(alias)) continue;
      seen.add(alias);
      aliases.push(alias);
      const key = normalizeSkillText(raw);
      if (key !== slug && key !== alias) {
        errors.push(
          `${slug}: "${raw}" looks up as "${key}", which is neither the slug nor the stored alias "${alias}"`,
        );
      }
    }
    if (aliases.length < 2) {
      errors.push(`${slug} has ${aliases.length} distinct aliases`);
    }
    expanded.push({
      slug,
      nameEn: entry.nameEn,
      nameRu: entry.nameRu,
      category: entry.category,
      aliases,
    });
  }

  const aliasOwner = new Map<string, string>();
  for (const entry of expanded) {
    for (const alias of entry.aliases) {
      const previous = aliasOwner.get(alias);
      if (previous && previous !== entry.slug) {
        errors.push(`alias ${alias} is on ${previous} and ${entry.slug}`);
      }
      aliasOwner.set(alias, entry.slug);
      if (slugSeen.has(alias) && alias !== entry.slug) {
        errors.push(
          `alias ${alias} of ${entry.slug} collides with the slug ${alias}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  return expanded;
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function renderSkillSeedSql(
  skills: readonly ExpandedSkill[] = expandCatalog(),
): string {
  const skillValues = skills
    .map(
      (entry) =>
        `  (${quote(entry.slug)}, ${quote(entry.nameEn)}, ${quote(entry.nameRu)}, ${quote(entry.category)})`,
    )
    .join(",\n");
  const aliasValues = skills
    .flatMap((entry) =>
      entry.aliases.map((alias) => `  (${quote(alias)}, ${quote(entry.slug)})`),
    )
    .join(",\n");

  return `INSERT INTO public.skills (slug, name_en, name_ru, category)
VALUES
${skillValues}
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ru = EXCLUDED.name_ru,
  category = EXCLUDED.category;

INSERT INTO public.skills_aliases (alias_normalized, skill_id)
SELECT v.alias_normalized, s.id
FROM (VALUES
${aliasValues}
) AS v(alias_normalized, slug)
JOIN public.skills s ON s.slug = v.slug
ON CONFLICT (alias_normalized) DO UPDATE SET
  skill_id = EXCLUDED.skill_id;
`;
}

export function renderSkillsMigration(): string {
  return `-- Migration 0003: skills, aliases, suggestions, canonical bootstrap.
-- Seed runs before RLS so the migration role can insert without a policy.
-- Repeating the inserts is safe: conflicts update names and alias targets only.

-- On the hosted project the migration role cannot create schemas or
-- extensions, so each step runs only when it is still missing (D40).
-- There pg_trgm and the grant are set up once by the postgres role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE SCHEMA extensions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE EXTENSION pg_trgm WITH SCHEMA extensions;
  END IF;
  IF NOT has_schema_privilege('app_rw', 'extensions', 'USAGE') THEN
    GRANT USAGE ON SCHEMA extensions TO app_rw;
  END IF;
END
$$;

DO $$
DECLARE
  sim_schema text;
BEGIN
  SELECT n.nspname
  INTO sim_schema
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'similarity'
    AND pg_get_function_identity_arguments(p.oid) = 'text, text'
  ORDER BY n.nspname
  LIMIT 1;

  IF sim_schema IS NULL THEN
    RAISE EXCEPTION 'pg_trgm similarity(text, text) is not installed';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.skill_similarity(left_text text, right_text text)
     RETURNS real
     LANGUAGE sql
     STABLE
     AS $fn$ SELECT %I.similarity(left_text, right_text) $fn$',
    sim_schema
  );
END
$$;

REVOKE ALL ON FUNCTION public.skill_similarity(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.skill_similarity(text, text) TO app_rw;

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ru text NOT NULL,
  category text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT skills_category_check CHECK (
    category IN (
      'engineering',
      'data',
      'design',
      'product',
      'marketing',
      'sales',
      'support',
      'operations',
      'finance',
      'hr'
    )
  )
);

CREATE TABLE public.skills_aliases (
  alias_normalized text PRIMARY KEY,
  skill_id uuid NOT NULL REFERENCES public.skills (id) ON DELETE CASCADE,
  CONSTRAINT skills_aliases_normalized_check CHECK (char_length(alias_normalized) >= 1)
);

CREATE INDEX skills_aliases_skill_id_idx ON public.skills_aliases (skill_id);

CREATE TABLE public.skill_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text text NOT NULL,
  normalized text NOT NULL UNIQUE,
  source text NOT NULL,
  occurrences integer NOT NULL DEFAULT 1,
  status moderation_status NOT NULL DEFAULT 'pending',
  mapped_skill_id uuid REFERENCES public.skills (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skill_suggestions_source_check CHECK (source IN ('user', 'bot', 'import')),
  CONSTRAINT skill_suggestions_occurrences_check CHECK (occurrences >= 1),
  CONSTRAINT skill_suggestions_normalized_check CHECK (char_length(normalized) >= 1),
  CONSTRAINT skill_suggestions_raw_text_check CHECK (char_length(raw_text) BETWEEN 1 AND 500)
);

CREATE INDEX skill_suggestions_mapped_skill_id_idx
  ON public.skill_suggestions (mapped_skill_id);

-- BEGIN skill seed
${renderSkillSeedSql().trim()}
-- END skill seed

SELECT public.enable_rls_deny_all('public.skills');
SELECT public.enable_rls_deny_all('public.skills_aliases');
SELECT public.enable_rls_deny_all('public.skill_suggestions');
`;
}
