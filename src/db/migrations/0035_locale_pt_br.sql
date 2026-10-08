-- D350: Brazilian Portuguese joins English, Russian and Spanish wherever a language is stored.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_locale_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_locale_check CHECK (locale IN ('en', 'ru', 'es', 'pt-BR'));

ALTER TABLE public.notification_emails
  DROP CONSTRAINT IF EXISTS notification_emails_locale_check;
ALTER TABLE public.notification_emails
  ADD CONSTRAINT notification_emails_locale_check CHECK (locale IN ('en', 'ru', 'es', 'pt-BR'));

ALTER TABLE public.telegram_login_challenges
  DROP CONSTRAINT IF EXISTS telegram_login_challenges_locale_check;
ALTER TABLE public.telegram_login_challenges
  ADD CONSTRAINT telegram_login_challenges_locale_check CHECK (locale IN ('en', 'ru', 'es', 'pt-BR'));

ALTER TABLE public.auth_email_waits
  DROP CONSTRAINT IF EXISTS auth_email_waits_locale_check;
ALTER TABLE public.auth_email_waits
  ADD CONSTRAINT auth_email_waits_locale_check CHECK (locale IN ('en', 'ru', 'es', 'pt-BR'));
