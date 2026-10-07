import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { flags } from "@/config/flags";
import { Link } from "@/i18n/navigation";
import { TelegramLoginButton } from "./telegram-login-button";
import { socialMark } from "./social-icons";
import { authAdminAvailable } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import type { AppLocale } from "@/i18n/routing";
import {
  telegramAuthUrl,
  telegramBotId,
  telegramBotToken,
} from "@/modules/auth/service";
import { localePrefix } from "@/i18n/paths";

const STUBS = ["google", "x"] as const;

/** Bot sign-in needs the bot token and the Auth admin key (D256). */
function telegramReady(): boolean {
  return Boolean(telegramBotToken() && authAdminAvailable());
}

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
 * Sign-in with Google and X — placeholders only (D200); OAuth is V2 (D7).
 * Telegram is real once configured (D217), otherwise a placeholder too.
 * Each row shows the provider mark next to the label.
 */
export async function SocialSignInStubs() {
  const t = await getTranslations("auth.social");
  const locale = await getLocale();
  const ready = telegramReady();
  // The widget only when its flag is on; otherwise the bot does the signing in.
  const telegram = ready ? await telegramHref() : null;
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
            {socialMark("telegram")}
            {t("telegram")}
          </a>
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
        </div>
      ) : ready ? (
        <TelegramLoginButton
          locale={locale as AppLocale}
          label={t("telegram")}
          waiting={t("telegramWaiting")}
          failed={t("telegramFailed")}
          icon={socialMark("telegram")}
        >
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
        </TelegramLoginButton>
      ) : null}
      {[...STUBS, ...(ready ? [] : (["telegram"] as const))].map((provider) => (
        <div key={provider} className="flex items-center gap-3">
          <Button
            variant="secondary"
            disabled
            className="flex-1"
            icon={socialMark(provider)}
          >
            {t(provider)}
          </Button>
          <Badge>{t("soon")}</Badge>
        </div>
      ))}
    </section>
  );
}
