-- M1: job markers (D202). Sectors, seniority, perks, four categories,
-- freelance/internship, Web3 skills. Lists match src/config/markers.ts.

ALTER TYPE public.employment_type ADD VALUE IF NOT EXISTS 'freelance';
ALTER TYPE public.employment_type ADD VALUE IF NOT EXISTS 'internship';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_seniority') THEN
    CREATE TYPE public.job_seniority AS ENUM (
      'internship', 'entry', 'mid', 'senior', 'lead'
    );
  END IF;
END
$$;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS seniority public.job_seniority,
  ADD COLUMN IF NOT EXISTS sectors text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS perks text[] NOT NULL DEFAULT '{}';

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.jobs'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE public.jobs DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END
$$;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_category_check,
  DROP CONSTRAINT IF EXISTS jobs_sectors_check,
  DROP CONSTRAINT IF EXISTS jobs_perks_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_category_check CHECK (
    category IN (
      'engineering', 'data', 'design', 'product', 'marketing', 'sales',
      'support', 'operations', 'finance', 'hr', 'legal', 'content',
      'community', 'research'
    )
  ),
  ADD CONSTRAINT jobs_sectors_check CHECK (
    cardinality(sectors) <= 3
    AND sectors <@ ARRAY[
      'web3', 'defi', 'nft', 'gamefi', 'metaverse', 'zk', 'dao', 'infra-l1l2',
      'exchange', 'memecoins', 'crypto-vc', 'eco-ethereum', 'eco-solana',
      'eco-fantom', 'eco-polkadot', 'ai-ml', 'genai', 'computer-vision',
      'robotics', 'data-analytics', 'fintech', 'banking', 'payments',
      'insurtech', 'quant-trading', 'accounting-tax', 'saas-b2b', 'devtools',
      'cloud-infra', 'open-source', 'cybersecurity', 'ecommerce',
      'marketplaces', 'adtech-martech', 'hr-tech', 'gamedev', 'igaming',
      'ar-vr', 'media-streaming', 'creator-economy', 'music', 'healthtech',
      'medtech', 'biotech', 'mental-health', 'fitness', 'edtech', 'govtech',
      'legaltech', 'nonprofit', 'climatetech', 'energy', 'logistics',
      'proptech', 'autotech', 'agritech', 'foodtech', 'travel', 'space',
      'hardware-iot', 'telecom'
    ]::text[]
  ),
  ADD CONSTRAINT jobs_perks_check CHECK (
    cardinality(perks) <= 8
    AND perks <@ ARRAY[
      'crypto-pay', 'token-equity', 'async', 'four-day-week', 'visa-support',
      'relocation', 'no-degree', 'junior-friendly', 'own-timezone'
    ]::text[]
  );

CREATE INDEX IF NOT EXISTS jobs_sectors_gin_idx ON public.jobs USING gin (sectors);

ALTER TABLE public.candidate_preferences
  ADD COLUMN IF NOT EXISTS sectors text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seniority public.job_seniority;

ALTER TABLE public.candidate_preferences
  DROP CONSTRAINT IF EXISTS candidate_preferences_categories_check,
  DROP CONSTRAINT IF EXISTS candidate_preferences_sectors_check;

ALTER TABLE public.candidate_preferences
  ADD CONSTRAINT candidate_preferences_categories_check CHECK (
    categories <@ ARRAY[
      'engineering', 'data', 'design', 'product', 'marketing', 'sales',
      'support', 'operations', 'finance', 'hr', 'legal', 'content',
      'community', 'research'
    ]::text[]
  ),
  ADD CONSTRAINT candidate_preferences_sectors_check CHECK (
    cardinality(sectors) <= 5
    AND sectors <@ ARRAY[
      'web3', 'defi', 'nft', 'gamefi', 'metaverse', 'zk', 'dao', 'infra-l1l2',
      'exchange', 'memecoins', 'crypto-vc', 'eco-ethereum', 'eco-solana',
      'eco-fantom', 'eco-polkadot', 'ai-ml', 'genai', 'computer-vision',
      'robotics', 'data-analytics', 'fintech', 'banking', 'payments',
      'insurtech', 'quant-trading', 'accounting-tax', 'saas-b2b', 'devtools',
      'cloud-infra', 'open-source', 'cybersecurity', 'ecommerce',
      'marketplaces', 'adtech-martech', 'hr-tech', 'gamedev', 'igaming',
      'ar-vr', 'media-streaming', 'creator-economy', 'music', 'healthtech',
      'medtech', 'biotech', 'mental-health', 'fitness', 'edtech', 'govtech',
      'legaltech', 'nonprofit', 'climatetech', 'energy', 'logistics',
      'proptech', 'autotech', 'agritech', 'foodtech', 'travel', 'space',
      'hardware-iot', 'telecom'
    ]::text[]
  );

ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_category_check;
ALTER TABLE public.skills
  ADD CONSTRAINT skills_category_check CHECK (
    category IN (
      'engineering', 'data', 'design', 'product', 'marketing', 'sales',
      'support', 'operations', 'finance', 'hr', 'legal', 'content',
      'community', 'research'
    )
  );

INSERT INTO public.skills (slug, name_en, name_ru, category) VALUES
  ('solidity', 'Solidity', 'Solidity', 'engineering'),
  ('smartcontracts', 'Smart Contracts', 'Смарт-контракты', 'engineering'),
  ('zkproofs', 'Zero-Knowledge Proofs', 'ZK-доказательства', 'engineering'),
  ('substrate', 'Substrate', 'Substrate', 'engineering'),
  ('evm', 'EVM', 'EVM', 'engineering'),
  ('anchor', 'Anchor', 'Anchor (Solana)', 'engineering'),
  ('web3js', 'web3.js', 'web3.js / ethers.js', 'engineering'),
  ('ios', 'iOS', 'iOS', 'engineering'),
  ('django', 'Django', 'Django', 'engineering'),
  ('rubyonrails', 'Ruby on Rails', 'Ruby on Rails', 'engineering'),
  ('sre', 'Site Reliability Engineering', 'SRE', 'engineering'),
  ('fullstack', 'Full-stack', 'Фулстек', 'engineering'),
  ('technicalwriting', 'Technical Writing', 'Техническое письмо', 'content'),
  ('translation', 'Translation', 'Переводы', 'content'),
  ('contentwriting', 'Content Writing', 'Контент', 'content'),
  ('memes', 'Meme Marketing', 'Мемы', 'marketing'),
  ('eventmarketing', 'Event Marketing', 'Ивент-маркетинг', 'marketing'),
  ('communitymanagement', 'Community Management', 'Комьюнити-менеджмент', 'community'),
  ('devrel', 'Developer Relations', 'DevRel', 'community'),
  ('compliance', 'Compliance', 'Комплаенс', 'legal'),
  ('aml', 'AML / KYC', 'AML / KYC', 'legal'),
  ('cryptolaw', 'Crypto Law', 'Крипто-право', 'legal'),
  ('tokenomics', 'Tokenomics', 'Токеномика', 'research'),
  ('economics', 'Economics', 'Экономика', 'research'),
  ('quant', 'Quantitative Analysis', 'Квант-анализ', 'research'),
  ('trading', 'Trading', 'Трейдинг', 'research'),
  ('venturecapital', 'Venture Capital', 'Венчур', 'research'),
  ('dataanalysis', 'Data Analysis', 'Анализ данных', 'data')
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ru = EXCLUDED.name_ru,
  category = EXCLUDED.category;

INSERT INTO public.skills_aliases (alias_normalized, skill_id)
SELECT v.alias_normalized, s.id
FROM (VALUES
  ('solidity', 'solidity'),
  ('sol', 'solidity'),
  ('smartcontracts', 'smartcontracts'),
  ('smartcontract', 'smartcontracts'),
  ('zkproofs', 'zkproofs'),
  ('zeroknowledgeproofs', 'zkproofs'),
  ('zk', 'zkproofs'),
  ('zeroknowledge', 'zkproofs'),
  ('zkp', 'zkproofs'),
  ('zksnarks', 'zkproofs'),
  ('substrate', 'substrate'),
  ('polkadotsdk', 'substrate'),
  ('evm', 'evm'),
  ('ethereumvirtualmachine', 'evm'),
  ('anchor', 'anchor'),
  ('solanaanchor', 'anchor'),
  ('web3js', 'web3js'),
  ('web3', 'web3js'),
  ('ethers', 'web3js'),
  ('ios', 'ios'),
  ('swift', 'ios'),
  ('swiftui', 'ios'),
  ('django', 'django'),
  ('djangorest', 'django'),
  ('rubyonrails', 'rubyonrails'),
  ('rails', 'rubyonrails'),
  ('ror', 'rubyonrails'),
  ('sre', 'sre'),
  ('sitereliability', 'sre'),
  ('sitereliabilityengineering', 'sre'),
  ('fullstack', 'fullstack'),
  ('fullstackdeveloper', 'fullstack'),
  ('technicalwriting', 'technicalwriting'),
  ('technicalwriter', 'technicalwriting'),
  ('docs', 'technicalwriting'),
  ('translation', 'translation'),
  ('translator', 'translation'),
  ('localization', 'translation'),
  ('contentwriting', 'contentwriting'),
  ('contentwriter', 'contentwriting'),
  ('memes', 'memes'),
  ('meme', 'memes'),
  ('mememarketing', 'memes'),
  ('eventmarketing', 'eventmarketing'),
  ('events', 'eventmarketing'),
  ('communitymanagement', 'communitymanagement'),
  ('communitymanager', 'communitymanagement'),
  ('discord', 'communitymanagement'),
  ('devrel', 'devrel'),
  ('developeradvocate', 'devrel'),
  ('compliance', 'compliance'),
  ('regulatory', 'compliance'),
  ('aml', 'aml'),
  ('amlkyc', 'aml'),
  ('antimoneylaundering', 'aml'),
  ('kyc', 'aml'),
  ('cryptolaw', 'cryptolaw'),
  ('cryptoregulation', 'cryptolaw'),
  ('tokenomics', 'tokenomics'),
  ('tokeneconomics', 'tokenomics'),
  ('economics', 'economics'),
  ('economist', 'economics'),
  ('quant', 'quant'),
  ('quantitativeanalysis', 'quant'),
  ('trading', 'trading'),
  ('marketmaking', 'trading'),
  ('venturecapital', 'venturecapital'),
  ('vc', 'venturecapital'),
  ('dataanalysis', 'dataanalysis'),
  ('dataanalyst', 'dataanalysis')
) AS v(alias_normalized, slug)
JOIN public.skills s ON s.slug = v.slug
ON CONFLICT (alias_normalized) DO UPDATE SET
  skill_id = EXCLUDED.skill_id;
