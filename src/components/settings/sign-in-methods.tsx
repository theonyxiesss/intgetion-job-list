"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { Button, buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type ErrorKey =
  | "email_required"
  | "generic"
  | "identity_taken"
  | "invalid_link"
  | "last_sign_in"
  | "oauth_unavailable"
  | "rate_limited"
  | "unavailable";

const errorKeys = new Set<ErrorKey>([
  "email_required",
  "generic",
  "identity_taken",
  "invalid_link",
  "last_sign_in",
  "oauth_unavailable",
  "rate_limited",
  "unavailable",
]);

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
  const reason = payload?.error?.details?.reason;
  return reason && errorKeys.has(reason as ErrorKey)
    ? (reason as ErrorKey)
    : "generic";
}

function MethodRow({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <div className="flex flex-col gap-1">
        <p className="t-label text-fg-muted">{label}</p>
        <p className="t-body">{value}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * Email, Telegram, Google and X on one account (D230, D231, D339).
 * A Telegram-only account can add an email. Each social account can be
 * linked or unlinked, except the last remaining sign-in method.
 */
export function SignInMethods({
  email,
  telegram,
  linkHref,
  google,
  x,
  notice,
}: {
  /** Real login email, or null for a Telegram-only account. */
  email: string | null;
  telegram: { username: string | null } | null;
  /** oauth.telegram.org link in "link" mode; null when the widget is off. */
  linkHref: string | null;
  google: { label: string | null } | null;
  x: { label: string | null } | null;
  /** Error brought back from an OAuth redirect. */
  notice?: string | null;
}) {
  const t = useTranslations("settings.signIn");
  const social = useTranslations("auth.social");
  const authErrors = useTranslations("auth.errors");
  const locale = useLocale();
  const appLocale: AppLocale = locale === "ru" ? "ru" : "en";
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<ErrorKey | null>(
    notice && errorKeys.has(notice as ErrorKey) ? (notice as ErrorKey) : null,
  );
  const [busy, setBusy] = useState(false);
  const oauthQuery = new URLSearchParams({ locale, link: "1" }).toString();

  function linkedText(account: { label: string | null } | null): string {
    if (!account) return t("notLinked");
    return account.label ? `${t("linked")} · ${account.label}` : t("linked");
  }

  async function unlinkOAuth(provider: "google" | "x") {
    setBusy(true);
    setError(null);
    const failed = await post("/api/auth/oauth/unlink", { provider });
    setBusy(false);
    if (failed) {
      setError(failed);
      return;
    }
    setStatus(provider === "google" ? t("unlinkedGoogle") : t("unlinkedX"));
    router.refresh();
  }

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

      <div className="flex flex-col gap-2">
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

      <MethodRow
        label={t("telegramLabel")}
        value={
          telegram
            ? `${t("linked")}${telegram.username ? ` · @${telegram.username}` : ""}`
            : t("notLinked")
        }
        action={
          telegram ? (
            <Button variant="secondary" onClick={unlink} disabled={busy}>
              {t("unlink")}
            </Button>
          ) : linkHref ? (
            <a href={linkHref} className={buttonClass("secondary")}>
              {t("linkTelegram")}
            </a>
          ) : (
            <TelegramLoginButton
              purpose="link"
              locale={appLocale}
              label={t("linkTelegram")}
              waiting={social("telegramWaiting")}
              failed={social("telegramFailed")}
              taken={authErrors("telegram_taken")}
              buttonClassName={buttonClass("secondary")}
            />
          )
        }
      />
      <MethodRow
        label={t("googleLabel")}
        value={linkedText(google)}
        action={
          google ? (
            <Button
              variant="secondary"
              onClick={() => void unlinkOAuth("google")}
              disabled={busy}
            >
              {t("unlink")}
            </Button>
          ) : (
            <a
              href={`/api/auth/google?${oauthQuery}`}
              className={buttonClass("secondary")}
            >
              {t("linkGoogle")}
            </a>
          )
        }
      />
      <MethodRow
        label={t("xLabel")}
        value={linkedText(x)}
        action={
          x ? (
            <Button
              variant="secondary"
              onClick={() => void unlinkOAuth("x")}
              disabled={busy}
            >
              {t("unlink")}
            </Button>
          ) : (
            <a
              href={`/api/auth/x?${oauthQuery}`}
              className={buttonClass("secondary")}
            >
              {t("linkX")}
            </a>
          )
        }
      />

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
