"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

/**
 * The way out of Telegram's frame for someone already signed in there (D316).
 * The session inside the frame cannot follow the person into their own
 * browser, so instead of asking them to sign in again we hand over a one-time
 * address that opens the same account outside — where the app installs and
 * the session is kept. The second button leads to adding an email, which is
 * what turns a Telegram-only account into one that can be recovered.
 */
export function MiniAppBar({ locale }: { locale: AppLocale }) {
  const t = useTranslations("miniApp");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function openOutside() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/auth/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!response.ok) throw new Error("handoff refused");
      const { url } = (await response.json()) as { url: string };
      // A new window from inside Telegram opens the person's own browser.
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="border-t border-line bg-surface px-4 py-3">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <p className="t-body-s text-fg-muted">{t("intro")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass("primary")}
            onClick={() => void openOutside()}
            disabled={busy}
          >
            <Icon icon={ExternalLink} size={16} />
            {t("open")}
          </button>
          <Link className={buttonClass("secondary")} href="/settings/account">
            {t("addEmail")}
          </Link>
        </div>
        {failed && (
          <p className="t-body-s text-danger" role="alert">
            {t("failed")}
          </p>
        )}
      </div>
    </aside>
  );
}
