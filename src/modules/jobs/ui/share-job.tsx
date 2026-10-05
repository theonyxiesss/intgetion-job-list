"use client";

import { Check, Link2, Send, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { shareUrl } from "./share-url";

/** Brand names, the same in every language. */
const NETWORKS = { telegram: "Telegram", linkedin: "LinkedIn" } as const;

/**
 * Share a job (D243): Telegram, LinkedIn, copy link and the phone's own
 * share sheet where the browser has one. No third-party scripts — plain
 * links that open the networks' share pages.
 */
export function ShareJob({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  text: { title: string; copy: string; copied: string; more: string };
}) {
  const t = (key: keyof typeof text) => text[key];
  const [copied, setCopied] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    // navigator is only readable after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNative(typeof navigator.share === "function");
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl(url, "copy"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the other buttons still work.
    }
  }

  const telegram = new URL("https://t.me/share/url");
  telegram.searchParams.set("url", shareUrl(url, "telegram"));
  telegram.searchParams.set("text", title);
  const linkedin = new URL("https://www.linkedin.com/sharing/share-offsite/");
  linkedin.searchParams.set("url", shareUrl(url, "linkedin"));
  const button = buttonClass("ghost", "md");

  return (
    <div className="flex flex-col gap-2">
      <p className="t-label text-fg-muted">{t("title")}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={telegram.toString()}
          target="_blank"
          rel="noreferrer"
          className={button}
        >
          <Icon icon={Send} size={16} />
          {NETWORKS.telegram}
        </a>
        <a
          href={linkedin.toString()}
          target="_blank"
          rel="noreferrer"
          className={button}
        >
          {NETWORKS.linkedin}
        </a>
        <button type="button" onClick={copy} className={button}>
          <Icon icon={copied ? Check : Link2} size={16} />
          {copied ? t("copied") : t("copy")}
        </button>
        {native ? (
          <button
            type="button"
            className={button}
            onClick={() =>
              navigator
                .share({ title, url: shareUrl(url, "native") })
                .catch(() => undefined)
            }
          >
            <Icon icon={Share2} size={16} />
            {t("more")}
          </button>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {copied ? t("copied") : ""}
      </p>
    </div>
  );
}
