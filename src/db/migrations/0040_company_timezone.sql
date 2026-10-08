-- Morning briefs: the employer slot follows the company's time zone
-- (docs/tz/20-morning-briefs.md §10.3). IANA name; NULL keeps `europe` (D340).

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS timezone text;
