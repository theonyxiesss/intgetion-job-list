"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText, Mail, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ProfileDraft } from "./profile-request";

export const PROFILE_DRAFT_KEY = "morrow_profile_draft";

const EMPTY: ProfileDraft = {
  name: "",
  role: "",
  skills: "",
  location: "",
  portfolio: "",
  cv: null,
};

type Step = "profile" | "signin" | "wait";

/**
 * The Morrow mockup's "Make it personal" window (TZ 53). A guest leaves an
 * email with the profile and signs in by the link in the letter: no
 * password, and this tab signs itself in once the link is opened anywhere.
 * The profile then goes to Spoki, which saves it through its card.
 */
export function ProfileDialog({
  signedIn,
  startWith,
  onClose,
  onSave,
}: {
  signedIn: boolean;
  startWith: "profile" | "signin";
  onClose: () => void;
  onSave: (draft: ProfileDraft) => void;
}) {
  const t = useTranslations("morrow.profile");
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>(startWith);
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY);
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  async function readCv(file: File) {
    setReading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/bot/attachment", {
        method: "POST",
        body: form,
      });
      const body = (await response.json().catch(() => null)) as {
        name?: string;
        text?: string;
      } | null;
      if (!response.ok || !body?.name || !body.text) {
        setError(t("cvFailed"));
        return;
      }
      setDraft((current) => ({
        ...current,
        cv: { name: body.name!, text: body.text! },
      }));
    } catch {
      setError(t("cvFailed"));
    } finally {
      setReading(false);
    }
  }

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  // The link may be opened on a phone: this tab asks until it is signed in.
  useEffect(() => {
    if (step !== "wait") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/auth/email-wait", {
          method: "POST",
        });
        const body = (await response.json()) as { ok?: boolean };
        if (response.ok && body.ok) window.location.reload();
      } catch {
        // The next poll tries again.
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [step]);

  async function sendLink(kind: "register" | "magic-link") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          locale,
          next: "home",
          ...(kind === "register" ? { acceptTerms: true } : {}),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { code?: string };
        } | null;
        setError(
          body?.error?.code === "RATE_LIMITED" ? t("tooMany") : t("failed"),
        );
        return;
      }
      setStep("wait");
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  function submitProfile(event: FormEvent) {
    event.preventDefault();
    if (signedIn) {
      onSave(draft);
      return;
    }
    try {
      window.sessionStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Without storage the profile is typed again after sign-in.
    }
    void sendLink("register");
  }

  function submitSignIn(event: FormEvent) {
    event.preventDefault();
    void sendLink("magic-link");
  }

  const field = (key: keyof Omit<ProfileDraft, "cv">, required = false) => (
    <label>
      {t(`fields.${key}`)}
      <input
        required={required}
        type={key === "portfolio" ? "url" : "text"}
        value={draft[key]}
        placeholder={t(`placeholders.${key}`)}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
      />
    </label>
  );

  return (
    <dialog
      ref={dialog}
      className="profile-dialog"
      aria-labelledby="profile-dialog-title"
      onCancel={onClose}
    >
      <div className="dialog-heading">
        <div>
          <h2 id="profile-dialog-title">
            {step === "wait"
              ? t("waitTitle")
              : step === "signin"
                ? t("signinTitle")
                : signedIn
                  ? t("titleSignedIn")
                  : t("title")}
          </h2>
          <p>
            {step === "wait"
              ? t("waitText", { email: email.trim() })
              : step === "signin"
                ? t("signinText")
                : signedIn
                  ? t("leadSignedIn")
                  : t("lead")}
          </p>
        </div>
        <button type="button" onClick={onClose}>
          <X size={18} aria-hidden="true" />
          <span className="sr-only">{t("close")}</span>
        </button>
      </div>
      {step === "profile" ? (
        <form onSubmit={submitProfile}>
          {field("name", true)}
          {field("role", true)}
          {field("skills", true)}
          {field("location")}
          <label className="profile-upload">
            <span>
              <FileText size={15} aria-hidden="true" />
              {reading ? t("cvReading") : (draft.cv?.name ?? t("cv"))}
            </span>
            <input
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void readCv(file);
              }}
            />
          </label>
          {field("portfolio")}
          {signedIn ? null : (
            <>
              <label>
                {t("fields.email")}
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  placeholder={t("placeholders.email")}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="profile-terms">
                <input
                  required
                  type="checkbox"
                  checked={terms}
                  onChange={(event) => setTerms(event.target.checked)}
                />
                <span>
                  {t.rich("terms", {
                    terms: (chunks) => <Link href="/terms">{chunks}</Link>,
                    privacy: (chunks) => <Link href="/privacy">{chunks}</Link>,
                  })}
                </span>
              </label>
            </>
          )}
          <p className="profile-privacy">
            {signedIn ? t("privacySignedIn") : t("privacy")}
          </p>
          {error ? (
            <p className="profile-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="profile-submit"
            disabled={busy || reading}
          >
            {signedIn ? t("save") : t("create")}
          </button>
          {signedIn ? null : (
            <button
              type="button"
              className="profile-switch"
              onClick={() => setStep("signin")}
            >
              {t("haveAccount")}
            </button>
          )}
        </form>
      ) : step === "signin" ? (
        <form onSubmit={submitSignIn}>
          <label>
            {t("fields.email")}
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              placeholder={t("placeholders.email")}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {error ? (
            <p className="profile-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="profile-submit" disabled={busy}>
            {t("sendLink")}
          </button>
          <button
            type="button"
            className="profile-switch"
            onClick={() => setStep("profile")}
          >
            {t("noAccount")}
          </button>
        </form>
      ) : (
        <div className="profile-wait" role="status">
          <Mail size={22} aria-hidden="true" />
          <p>{t("waitHint")}</p>
          <button
            type="button"
            className="profile-switch"
            onClick={() => setStep(startWith)}
          >
            {t("otherEmail")}
          </button>
        </div>
      )}
    </dialog>
  );
}
