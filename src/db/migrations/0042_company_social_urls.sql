-- Public company links on the job page (D372). Empty stays empty.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS telegram_url text,
  ADD COLUMN IF NOT EXISTS x_url text;
