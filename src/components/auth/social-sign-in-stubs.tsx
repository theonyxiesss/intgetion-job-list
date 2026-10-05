import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { flags } from "@/config/flags";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { authAdminAvailable } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import {
  telegramAuthUrl,
  telegramBotId,
  telegramBotToken,
} from "@/modules/auth/service";
import { TelegramLoginButton } from "./telegram-login-button";

const STUBS = ["google", "x"] as const;

/** Frozen widget (D246). The bot button is the default until this flag is on. */
async function telegramHref(): Promise<string | null> {
  const token = telegramBotToken();
  if (!flags.telegramLoginEnabled || !token || !authAdminAvailable()) {
    return null;
  }
  const origin = siteUrl();
  const locale = await getLocale();
  return telegramAuthUrl({
    botId: telegramBotId(token),
    origin,
    returnTo: `${origin}/${locale}/auth/telegram`,
  });
}

/**
 * Sign-in with Google and X — placeholders only (D200); OAuth is V2 (D7).
 * Telegram is real once configured (D217), otherwise a placeholder too.
 */
export async function SocialSignInStubs() {
  const t = await getTranslations("auth.social");
  const locale = (await getLocale()) === "ru" ? "ru" : "en";
  const telegram = await telegramHref();
  const terms = (
    <p className="t-caption text-fg-muted">
      {t.rich("telegramTerms", {
        terms: (chunks) => (
          <Link href="/terms" className="underline">
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link href="/privacy" className="underline">
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
  return (
    <section aria-labelledby="social-sign-in" className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-fg-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        <h2 id="social-sign-in" className="t-label">
          {t("title")}
        </h2>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>
      {telegram ? (
        <div className="flex flex-col gap-1">
          <a
            href={telegram}
            className={buttonClass("secondary", "md", "w-full")}
          >
            {t("telegram")}
          </a>
          {terms}
        </div>
      ) : (
        <TelegramLoginButton
          locale={locale satisfies AppLocale}
          label={t("telegram")}
          waiting={t("telegramWaiting")}
          failed={t("telegramFailed")}
        >
          {terms}
        </TelegramLoginButton>
      )}
      {STUBS.map((provider) => (
        <div key={provider} className="flex items-center gap-3">
          <Button variant="secondary" disabled className="flex-1">
            {t(provider)}
          </Button>
          <Badge>{t("soon")}</Badge>
        </div>
      ))}
    </section>
  );
}
