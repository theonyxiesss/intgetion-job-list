"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

/**
 * oauth.telegram.org returns to `/auth/telegram#tgAuthResult=…`. The
 * fragment never reaches the server, so this page posts it (D217).
 */
export function TelegramFinish() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const result = hash.get("tgAuthResult");
    // Drop the signed data from the address bar and history.
    window.history.replaceState(null, "", window.location.pathname);
    const request = result
      ? fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ result, locale }),
        })
      : Promise.reject(new Error("no tgAuthResult"));
    request
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        router.replace("/");
        router.refresh();
      })
      .catch(() => setFailed(true));
  }, [locale, router]);

  if (!failed) return <p role="status">{t("social.telegramProgress")}</p>;
  return (
    <div className="flex flex-col gap-3">
      <p role="alert">{t("errors.telegram_failed")}</p>
      <Link href="/login" className="underline">
        {t("toLogin")}
      </Link>
    </div>
  );
}
