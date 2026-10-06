"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  deliverHandoffUrl,
  handoffNeedsCopy,
  isOwnHandoffUrl,
  reserveBrowserPopup,
  telegramWebApp,
} from "./mini-app-open";

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
  const linkField = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function openOutside() {
    setBusy(true);
    setFailed(false);
    setUrl(null);
    setCopied(false);
    // Reserve the window before any await, or the browser treats the open
    // as unsolicited and drops it. A phone webview is not given one: it
    // would stay inside Telegram (D317).
    const webView = handoffNeedsCopy(navigator.userAgent);
    const openExternal = telegramWebApp(window)?.openLink;
    const popup =
      webView || openExternal
        ? null
        : reserveBrowserPopup((target, name) => window.open(target, name));

    void (async () => {
      try {
        const response = await fetch("/api/auth/handoff", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        if (!response.ok) throw new Error("handoff refused");
        const body = (await response.json()) as { url?: unknown };
        if (
          typeof body.url !== "string" ||
          !isOwnHandoffUrl(body.url, window.location.origin)
        ) {
          throw new Error("handoff refused");
        }
        const result = deliverHandoffUrl(body.url, {
          popup,
          openExternal,
          webView,
        });
        if (result.reveal) setUrl(body.url);
      } catch {
        popup?.close();
        setFailed(true);
      } finally {
        setBusy(false);
      }
    })();
  }

  function copyLink() {
    const field = linkField.current;
    field?.focus();
    field?.select();
    if (!url) return;
    void navigator.clipboard?.writeText(url).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }

  return (
    <aside
      data-mini-app-bar
      className="border-t border-line bg-surface px-4 py-3 max-md:mb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <p className="t-body-s text-fg-muted">{t("intro")}</p>
        <p className="t-body-s text-fg-muted">{t("install")}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className={buttonClass("primary", "md", "w-full sm:w-auto")}
            onClick={openOutside}
            disabled={busy}
          >
            <Icon icon={ExternalLink} size={16} />
            {t("open")}
          </button>
          <Link
            className={buttonClass("secondary", "md", "w-full sm:w-auto")}
            href="/settings/account"
          >
            {t("addEmail")}
          </Link>
        </div>
        {url && (
          <div className="flex flex-col gap-2" role="status">
            <p className="t-body-s text-fg-muted">{t("copyHint")}</p>
            <input
              ref={linkField}
              readOnly
              value={url}
              aria-label={t("copyHint")}
              className={controlClass}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              className={buttonClass("secondary", "md", "w-full sm:w-auto")}
              onClick={copyLink}
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
        )}
        {failed && (
          <p className="t-body-s text-danger" role="alert">
            {t("failed")}
          </p>
        )}
      </div>
    </aside>
  );
}
