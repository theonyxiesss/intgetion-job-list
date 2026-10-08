import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { flags } from "@/config/flags";
import { Link } from "@/i18n/navigation";
import { SocialMark } from "./social-marks";
import { TelegramLoginButton } from "./telegram-login-button";
import { authAdminAvailable } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import type { AppLocale } from "@/i18n/routing";
import {
  telegramAuthUrl,
  telegramBotId,
  telegramBotToken,
} from "@/modules/auth/service";
import { localePrefix } from "@/i18n/paths";
import type { LoginNext } from "./login-next";

/** The frozen widget sign-in, still behind its flag (D217, D246). */
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
    returnTo: `${origin}${localePrefix(locale)}/auth/telegram`,
  });
}

/**
 * Google and X go through Supabase (D335, D336). Telegram is the bot button (D256).
 */
export async function SocialSignInStubs({ next }: { next?: LoginNext }) {
  const t = await getTranslations("auth.social");
  const locale = await getLocale();
  const telegram = await telegramHref();
  const oauthParams = new URLSearchParams({ locale });
  if (next) oauthParams.set("next", next);
  const oauthQuery = oauthParams.toString();
  const terms = (chunks: ReactNode) => (
    <Link href="/terms" className="underline">
      {chunks}
    </Link>
  );
  const privacy = (chunks: ReactNode) => (
    <Link href="/privacy" className="underline">
      {chunks}
    </Link>
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
      <a
        href={`/api/auth/google?${oauthQuery}`}
        className={buttonClass("secondary", "md", "w-full")}
      >
        <SocialMark name="google" />
        {t("google")}
      </a>
      {telegram ? (
        <a href={telegram} className={buttonClass("secondary", "md", "w-full")}>
          <SocialMark name="telegram" />
          {t("telegram")}
        </a>
      ) : (
        <TelegramLoginButton
          locale={locale as AppLocale}
          label={t("telegram")}
          waiting={t("telegramWaiting")}
          failed={t("telegramFailed")}
          icon={<SocialMark name="telegram" />}
        />
      )}
      <a
        href={`/api/auth/x?${oauthQuery}`}
        className={buttonClass("secondary", "md", "w-full")}
      >
        <SocialMark name="x" />
        {t("x")}
      </a>
      <p className="t-caption text-fg-muted">
        {t.rich("continueTerms", { terms, privacy })}
      </p>
    </section>
  );
}
