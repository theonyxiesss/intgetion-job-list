import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PROVIDERS = ["google", "x", "telegram"] as const;

/**
 * Sign-in with Google, X and Telegram — placeholders only (D200). OAuth is
 * V2 (D7); Telegram needs its Login Widget and a bot token, not Supabase:
 * the buttons are disabled and send nothing.
 */
export async function SocialSignInStubs() {
  const t = await getTranslations("auth.social");
  return (
    <section aria-labelledby="social-sign-in" className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-fg-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        <h2 id="social-sign-in" className="t-label">
          {t("title")}
        </h2>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>
      {PROVIDERS.map((provider) => (
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
