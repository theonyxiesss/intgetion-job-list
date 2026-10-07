"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";

type ErrorKey = "email_required" | "generic" | "rate_limited" | "unavailable";

async function post(path: string, body?: unknown): Promise<ErrorKey | null> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  if (response?.ok) return null;
  if (response?.status === 429) return "rate_limited";
  if (response?.status === 503) return "unavailable";
  const payload = (await response?.json().catch(() => null)) as {
    error?: { details?: { reason?: string } };
  } | null;
  return payload?.error?.details?.reason === "email_required"
    ? "email_required"
    : "generic";
}

/**
 * Email and Telegram on one account (D230, D231): a Telegram-only account
 * adds an email; any account links or unlinks Telegram.
 */
export function SignInMethods({
  email,
  telegram,
  linkHref,
}: {
  /** Real login email, or null for a Telegram-only account. */
  email: string | null;
  telegram: { username: string | null } | null;
  /** oauth.telegram.org link in "link" mode; null when Telegram is off. */
  linkHref: string | null;
}) {
  const t = useTranslations("settings.signIn");
  const locale = useLocale();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);

  async function addEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const failed = await post("/api/me/email", { email: address, locale });
    setBusy(false);
    if (failed) setError(failed);
    else setStatus(t("sent"));
  }

  async function unlink() {
    setBusy(true);
    setError(null);
    const failed = await post("/api/auth/telegram/unlink");
    setBusy(false);
    if (failed) {
      setError(failed);
      return;
    }
    setStatus(t("unlinked"));
    router.refresh();
  }

  return (
    <section
      aria-labelledby="sign-in-methods"
      className="flex flex-col gap-4 border border-line p-6"
    >
      <h2 id="sign-in-methods" className="t-h3">
        {t("title")}
      </h2>

      <div className="flex flex-col gap-2 border-b border-line pb-4">
        <p className="t-label text-fg-muted">{t("emailLabel")}</p>
        {email ? (
          <div className="flex flex-col gap-2">
            <p className="t-body break-all">{email}</p>
            <p className="t-body-s text-fg-muted">{t("setPasswordHint")}</p>
            <div>
              <Link href="/reset-password" className={buttonClass("secondary")}>
                {t("setPassword")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={addEmail} className="flex flex-col gap-3">
            <p className="t-body-s text-fg-muted">{t("noEmail")}</p>
            <Field label={t("emailLabel")} help={t("emailHint")}>
              <Input
                type="email"
                required
                autoComplete="email"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </Field>
            <div>
              <Button type="submit" variant="secondary" disabled={busy}>
                {t("addEmail")}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="t-label text-fg-muted">{t("telegramLabel")}</p>
          <p className="t-body">
            {telegram
              ? `${t("telegramLinked")}${telegram.username ? ` · @${telegram.username}` : ""}`
              : t("telegramNotLinked")}
          </p>
        </div>
        {telegram ? (
          <Button variant="secondary" onClick={unlink} disabled={busy}>
            {t("unlinkTelegram")}
          </Button>
        ) : linkHref ? (
          <a href={linkHref} className={buttonClass("secondary")}>
            {t("linkTelegram")}
          </a>
        ) : null}
      </div>

      <p role="status" className="t-body-s text-fg-muted">
        {status ?? ""}
      </p>
      {error ? (
        <p role="alert" className="t-body-s text-danger">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </section>
  );
}
