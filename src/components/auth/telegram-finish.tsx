"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { authFailureOf, postJson, type AuthFailure } from "./auth-failure";
import { FormAlert } from "./fields";

/**
 * oauth.telegram.org returns to `/auth/telegram#tgAuthResult=…`. The
 * fragment never reaches the server, so this page posts it (D217).
 */
export function TelegramFinish() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [failed, setFailed] = useState<AuthFailure | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const result = hash.get("tgAuthResult");
    // "?link=1": attach Telegram to the signed-in account (D230).
    const link =
      new URLSearchParams(window.location.search).get("link") === "1";
    // Drop the signed data from the address bar and history.
    window.history.replaceState(null, "", window.location.pathname);
    const request = result
      ? postJson("/api/auth/telegram", {
          result,
          locale,
          mode: link ? "link" : "signin",
        })
      : Promise.resolve(undefined);
    void request.then(async (response) => {
      if (response === undefined) {
        setFailed({ code: "telegram_failed" });
        return;
      }
      if (response?.ok) {
        router.replace(link ? "/settings/account" : "/");
        router.refresh();
        return;
      }
      if (response?.status === 409) {
        setFailed({ code: "telegram_taken" });
        return;
      }
      // Auth down for everyone and no connection get their own text (D606);
      // anything else stays "Telegram did not work".
      const failure = await authFailureOf(response);
      setFailed(
        failure.code === "auth_unavailable" || failure.code === "network"
          ? failure
          : { code: "telegram_failed", requestId: failure.requestId },
      );
    });
  }, [locale, router]);

  if (!failed) return <p role="status">{t("social.telegramProgress")}</p>;
  return (
    <div className="flex flex-col gap-3">
      <FormAlert requestId={failed.requestId}>
        {t(`errors.${failed.code}`)}
      </FormAlert>
      <Link href="/login" className="underline">
        {t("toLogin")}
      </Link>
    </div>
  );
}
