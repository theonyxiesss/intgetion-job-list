-- Migration 0003: skills, aliases, suggestions, canonical bootstrap.
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
INSERT INTO public.skills (slug, name_en, name_ru, category)
VALUES
  ('javascript', 'JavaScript', 'JavaScript', 'engineering'),
  ('typescript', 'TypeScript', 'TypeScript', 'engineering'),
  ('react', 'React', 'React', 'engineering'),
  ('vue', 'Vue.js', 'Vue.js', 'engineering'),
  ('angular', 'Angular', 'Angular', 'engineering'),
  ('next', 'Next.js', 'Next.js', 'engineering'),
  ('node', 'Node.js', 'Node.js', 'engineering'),
  ('python', 'Python', 'Python', 'engineering'),
  ('java', 'Java', 'Java', 'engineering'),
  ('kotlin', 'Kotlin', 'Kotlin', 'engineering'),
  ('go', 'Go', 'Go', 'engineering'),
  ('rust', 'Rust', 'Rust', 'engineering'),
  ('csharp', 'C#', 'C#', 'engineering'),
  ('cpp', 'C++', 'C++', 'engineering'),
  ('php', 'PHP', 'PHP', 'engineering'),
  ('ruby', 'Ruby', 'Ruby', 'engineering'),
  ('docker', 'Docker', 'Docker', 'engineering'),
  ('kubernetes', 'Kubernetes', 'Kubernetes', 'engineering'),
  ('aws', 'AWS', 'AWS', 'engineering'),
  ('git', 'Git', 'Git', 'engineering'),
  ('sql', 'SQL', 'SQL', 'data'),
  ('postgresql', 'PostgreSQL', 'PostgreSQL', 'data'),
  ('mysql', 'MySQL', 'MySQL', 'data'),
  ('mongodb', 'MongoDB', 'MongoDB', 'data'),
  ('redis', 'Redis', 'Redis', 'data'),
  ('apachespark', 'Apache Spark', 'Apache Spark', 'data'),
  ('apacheairflow', 'Apache Airflow', 'Apache Airflow', 'data'),
  ('tableau', 'Tableau', 'Tableau', 'data'),
  ('machinelearning', 'Machine Learning', 'Машинное обучение', 'data'),
  ('pandas', 'Pandas', 'Pandas', 'data'),
  ('figma', 'Figma', 'Figma', 'design'),
  ('sketch', 'Sketch', 'Sketch', 'design'),
  ('adobexd', 'Adobe XD', 'Adobe XD', 'design'),
  ('photoshop', 'Photoshop', 'Photoshop', 'design'),
  ('illustrator', 'Illustrator', 'Illustrator', 'design'),
  ('uidesign', 'UI Design', 'UI-дизайн', 'design'),
  ('uxdesign', 'UX Design', 'UX-дизайн', 'design'),
  ('designsystems', 'Design Systems', 'Дизайн-системы', 'design'),
  ('prototyping', 'Prototyping', 'Прототипирование', 'design'),
  ('usability', 'Usability', 'Юзабилити', 'design'),
  ('productmanagement', 'Product Management', 'Продакт-менеджмент', 'product'),
  ('roadmapping', 'Roadmapping', 'Дорожные карты продукта', 'product'),
  ('agile', 'Agile', 'Agile', 'product'),
  ('scrum', 'Scrum', 'Scrum', 'product'),
  ('kanban', 'Kanban', 'Канбан', 'product'),
  ('jira', 'Jira', 'Jira', 'product'),
  ('confluence', 'Confluence', 'Confluence', 'product'),
  ('productanalytics', 'Product Analytics', 'Продуктовая аналитика', 'product'),
  ('abtesting', 'A/B Testing', 'A/B-тестирование', 'product'),
  ('userresearch', 'User Research', 'Исследования пользователей', 'product'),
  ('seo', 'SEO', 'Поисковая оптимизация', 'marketing'),
  ('contentmarketing', 'Content Marketing', 'Контент-маркетинг', 'marketing'),
  ('copywriting', 'Copywriting', 'Копирайтинг', 'marketing'),
  ('emailmarketing', 'Email Marketing', 'Email-маркетинг', 'marketing'),
  ('socialmediamarketing', 'Social Media Marketing', 'Маркетинг в социальных сетях', 'marketing'),
  ('googleanalytics', 'Google Analytics', 'Google Analytics', 'marketing'),
  ('googleads', 'Google Ads', 'Google Ads', 'marketing'),
  ('brandmanagement', 'Brand Management', 'Управление брендом', 'marketing'),
  ('conversionoptimization', 'Conversion Optimization', 'Оптимизация конверсии', 'marketing'),
  ('marketingautomation', 'Marketing Automation', 'Автоматизация маркетинга', 'marketing'),
  ('sales', 'Sales', 'Продажи', 'sales'),
  ('b2bsales', 'B2B Sales', 'B2B-продажи', 'sales'),
  ('crm', 'CRM', 'CRM', 'sales'),
  ('salesforce', 'Salesforce', 'Salesforce', 'sales'),
  ('hubspot', 'HubSpot', 'HubSpot', 'sales'),
  ('negotiation', 'Negotiation', 'Переговоры', 'sales'),
  ('leadgeneration', 'Lead Generation', 'Лидогенерация', 'sales'),
  ('accountmanagement', 'Account Management', 'Ведение ключевых клиентов', 'sales'),
  ('customersupport', 'Customer Support', 'Поддержка клиентов', 'support'),
  ('customersuccess', 'Customer Success', 'Сопровождение клиентов', 'support'),
  ('zendesk', 'Zendesk', 'Zendesk', 'support'),
  ('intercom', 'Intercom', 'Intercom', 'support'),
  ('helpdesk', 'Help Desk', 'Служба поддержки', 'support'),
  ('troubleshooting', 'Troubleshooting', 'Поиск и устранение неисправностей', 'support'),
  ('servicelevelagreements', 'Service Level Agreements', 'Соглашения об уровне сервиса', 'support'),
  ('customeronboarding', 'Customer Onboarding', 'Онбординг клиентов', 'support'),
  ('projectmanagement', 'Project Management', 'Управление проектами', 'operations'),
  ('operationsmanagement', 'Operations Management', 'Операционный менеджмент', 'operations'),
  ('supplychain', 'Supply Chain', 'Управление цепочкой поставок', 'operations'),
  ('logistics', 'Logistics', 'Логистика', 'operations'),
  ('processimprovement', 'Process Improvement', 'Улучшение процессов', 'operations'),
  ('vendormanagement', 'Vendor Management', 'Управление поставщиками', 'operations'),
  ('procurement', 'Procurement', 'Закупки', 'operations'),
  ('lean', 'Lean', 'Бережливое производство', 'operations'),
  ('accounting', 'Accounting', 'Бухгалтерский учёт', 'finance'),
  ('bookkeeping', 'Bookkeeping', 'Ведение учёта', 'finance'),
  ('financialanalysis', 'Financial Analysis', 'Финансовый анализ', 'finance'),
  ('budgeting', 'Budgeting', 'Бюджетирование', 'finance'),
  ('fpa', 'FP&A', 'Финансовое планирование и анализ', 'finance'),
  ('quickbooks', 'QuickBooks', 'QuickBooks', 'finance'),
  ('tax', 'Tax', 'Налоги', 'finance'),
  ('payroll', 'Payroll', 'Расчёт заработной платы', 'finance'),
  ('recruiting', 'Recruiting', 'Подбор персонала', 'hr'),
  ('talentsourcing', 'Talent Sourcing', 'Сорсинг кандидатов', 'hr'),
  ('interviewing', 'Interviewing', 'Проведение собеседований', 'hr'),
  ('employeeonboarding', 'Employee Onboarding', 'Адаптация сотрудников', 'hr'),
  ('employeerelations', 'Employee Relations', 'Трудовые отношения', 'hr'),
  ('compensation', 'Compensation', 'Компенсации и льготы', 'hr'),
  ('hris', 'HRIS', 'Кадровые информационные системы', 'hr'),
  ('peopleoperations', 'People Operations', 'Операционное управление персоналом', 'hr')
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ru = EXCLUDED.name_ru,
  category = EXCLUDED.category;

INSERT INTO public.skills_aliases (alias_normalized, skill_id)
SELECT v.alias_normalized, s.id
FROM (VALUES
  ('javascript', 'javascript'),
  ('js', 'javascript'),
  ('ecmascript', 'javascript'),
  ('typescript', 'typescript'),
  ('ts', 'typescript'),
  ('react', 'react'),
  ('reactjs', 'react'),
  ('vue', 'vue'),
  ('vuejs', 'vue'),
  ('angular', 'angular'),
  ('angularframework', 'angular'),
  ('next', 'next'),
  ('nextjs', 'next'),
  ('node', 'node'),
  ('nodejs', 'node'),
  ('python', 'python'),
  ('pythonlanguage', 'python'),
  ('java', 'java'),
  ('javase', 'java'),
  ('kotlin', 'kotlin'),
  ('kotlinlanguage', 'kotlin'),
  ('go', 'go'),
  ('golang', 'go'),
  ('rust', 'rust'),
  ('rustlanguage', 'rust'),
  ('csharp', 'csharp'),
  ('csharplanguage', 'csharp'),
  ('cpp', 'cpp'),
  ('cplusplus', 'cpp'),
  ('php', 'php'),
  ('phplanguage', 'php'),
  ('ruby', 'ruby'),
  ('rubylanguage', 'ruby'),
  ('docker', 'docker'),
  ('dockerengine', 'docker'),
  ('kubernetes', 'kubernetes'),
  ('k8s', 'kubernetes'),
  ('aws', 'aws'),
  ('amazonwebservices', 'aws'),
  ('git', 'git'),
  ('gitversioncontrol', 'git'),
  ('sql', 'sql'),
  ('structuredquerylanguage', 'sql'),
  ('postgresql', 'postgresql'),
  ('postgres', 'postgresql'),
  ('mysql', 'mysql'),
  ('mysqldatabase', 'mysql'),
  ('mongodb', 'mongodb'),
  ('mongo', 'mongodb'),
  ('redis', 'redis'),
  ('redisdatabase', 'redis'),
  ('apachespark', 'apachespark'),
  ('spark', 'apachespark'),
  ('apacheairflow', 'apacheairflow'),
  ('airflow', 'apacheairflow'),
  ('tableau', 'tableau'),
  ('tableaudesktop', 'tableau'),
  ('machinelearning', 'machinelearning'),
  ('ml', 'machinelearning'),
  ('pandas', 'pandas'),
  ('pandaslibrary', 'pandas'),
  ('figma', 'figma'),
  ('figmadesign', 'figma'),
  ('sketch', 'sketch'),
  ('sketchapp', 'sketch'),
  ('adobexd', 'adobexd'),
  ('adobeexperiencedesign', 'adobexd'),
  ('photoshop', 'photoshop'),
  ('adobephotoshop', 'photoshop'),
  ('illustrator', 'illustrator'),
  ('adobeillustrator', 'illustrator'),
  ('uidesign', 'uidesign'),
  ('userinterfacedesign', 'uidesign'),
  ('uxdesign', 'uxdesign'),
  ('userexperiencedesign', 'uxdesign'),
  ('designsystems', 'designsystems'),
  ('designsystem', 'designsystems'),
  ('prototyping', 'prototyping'),
  ('interactiveprototype', 'prototyping'),
  ('usability', 'usability'),
  ('usabilitytesting', 'usability'),
  ('productmanagement', 'productmanagement'),
  ('productmanager', 'productmanagement'),
  ('roadmapping', 'roadmapping'),
  ('productroadmap', 'roadmapping'),
  ('agile', 'agile'),
  ('agilemethodology', 'agile'),
  ('scrum', 'scrum'),
  ('scrumframework', 'scrum'),
  ('kanban', 'kanban'),
  ('kanbanmethod', 'kanban'),
  ('jira', 'jira'),
  ('jirasoftware', 'jira'),
  ('confluence', 'confluence'),
  ('atlassianconfluence', 'confluence'),
  ('productanalytics', 'productanalytics'),
  ('productmetrics', 'productanalytics'),
  ('abtesting', 'abtesting'),
  ('splittesting', 'abtesting'),
  ('userresearch', 'userresearch'),
  ('customerresearch', 'userresearch'),
  ('seo', 'seo'),
  ('searchengineoptimization', 'seo'),
  ('contentmarketing', 'contentmarketing'),
  ('contentmarketingstrategy', 'contentmarketing'),
  ('copywriting', 'copywriting'),
  ('marketingcopy', 'copywriting'),
  ('emailmarketing', 'emailmarketing'),
  ('emailcampaigns', 'emailmarketing'),
  ('socialmediamarketing', 'socialmediamarketing'),
  ('smm', 'socialmediamarketing'),
  ('googleanalytics', 'googleanalytics'),
  ('ga4', 'googleanalytics'),
  ('googleads', 'googleads'),
  ('googleadwords', 'googleads'),
  ('brandmanagement', 'brandmanagement'),
  ('branding', 'brandmanagement'),
  ('conversionoptimization', 'conversionoptimization'),
  ('cro', 'conversionoptimization'),
  ('marketingautomation', 'marketingautomation'),
  ('marketingautomationplatform', 'marketingautomation'),
  ('sales', 'sales'),
  ('selling', 'sales'),
  ('b2bsales', 'b2bsales'),
  ('businesstobusinesssales', 'b2bsales'),
  ('crm', 'crm'),
  ('customerrelationshipmanagement', 'crm'),
  ('salesforce', 'salesforce'),
  ('sfdc', 'salesforce'),
  ('hubspot', 'hubspot'),
  ('hubspotcrm', 'hubspot'),
  ('negotiation', 'negotiation'),
  ('salesnegotiation', 'negotiation'),
  ('leadgeneration', 'leadgeneration'),
  ('leadgen', 'leadgeneration'),
  ('accountmanagement', 'accountmanagement'),
  ('keyaccountmanagement', 'accountmanagement'),
  ('customersupport', 'customersupport'),
  ('customerservice', 'customersupport'),
  ('customersuccess', 'customersuccess'),
  ('clientsuccess', 'customersuccess'),
  ('zendesk', 'zendesk'),
  ('zendesksupport', 'zendesk'),
  ('intercom', 'intercom'),
  ('intercomsupport', 'intercom'),
  ('helpdesk', 'helpdesk'),
  ('servicedesk', 'helpdesk'),
  ('troubleshooting', 'troubleshooting'),
  ('faultdiagnosis', 'troubleshooting'),
  ('servicelevelagreements', 'servicelevelagreements'),
  ('sla', 'servicelevelagreements'),
  ('customeronboarding', 'customeronboarding'),
  ('clientonboarding', 'customeronboarding'),
  ('projectmanagement', 'projectmanagement'),
  ('projectmanager', 'projectmanagement'),
  ('operationsmanagement', 'operationsmanagement'),
  ('businessoperations', 'operationsmanagement'),
  ('supplychain', 'supplychain'),
  ('supplychainmanagement', 'supplychain'),
  ('logistics', 'logistics'),
  ('logisticsmanagement', 'logistics'),
  ('processimprovement', 'processimprovement'),
  ('continuousimprovement', 'processimprovement'),
  ('vendormanagement', 'vendormanagement'),
  ('suppliermanagement', 'vendormanagement'),
  ('procurement', 'procurement'),
  ('purchasing', 'procurement'),
  ('lean', 'lean'),
  ('leanoperations', 'lean'),
  ('accounting', 'accounting'),
  ('financialaccounting', 'accounting'),
  ('bookkeeping', 'bookkeeping'),
  ('doubleentrybookkeeping', 'bookkeeping'),
  ('financialanalysis', 'financialanalysis'),
  ('financialstatementanalysis', 'financialanalysis'),
  ('budgeting', 'budgeting'),
  ('budgetplanning', 'budgeting'),
  ('fpa', 'fpa'),
  ('financialplanningandanalysis', 'fpa'),
  ('quickbooks', 'quickbooks'),
  ('quickbooksonline', 'quickbooks'),
  ('tax', 'tax'),
  ('taxation', 'tax'),
  ('payroll', 'payroll'),
  ('payrollprocessing', 'payroll'),
  ('recruiting', 'recruiting'),
  ('recruitment', 'recruiting'),
  ('talentsourcing', 'talentsourcing'),
  ('candidatesourcing', 'talentsourcing'),
  ('interviewing', 'interviewing'),
  ('candidateinterviews', 'interviewing'),
  ('employeeonboarding', 'employeeonboarding'),
  ('newhireonboarding', 'employeeonboarding'),
  ('employeerelations', 'employeerelations'),
  ('staffrelations', 'employeerelations'),
  ('compensation', 'compensation'),
  ('compensationandbenefits', 'compensation'),
  ('hris', 'hris'),
  ('humanresourceinformationsystem', 'hris'),
  ('peopleoperations', 'peopleoperations'),
  ('peopleops', 'peopleoperations')
) AS v(alias_normalized, slug)
JOIN public.skills s ON s.slug = v.slug
ON CONFLICT (alias_normalized) DO UPDATE SET
  skill_id = EXCLUDED.skill_id;
-- END skill seed

SELECT public.enable_rls_deny_all('public.skills');
SELECT public.enable_rls_deny_all('public.skills_aliases');
SELECT public.enable_rls_deny_all('public.skill_suggestions');
