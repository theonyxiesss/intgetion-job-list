"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, ButtonLink, Field, Input } from "@/components/ui";

type Start =
  | { mode: "enroll"; factorId: string; secret: string }
  | { mode: "challenge"; factorId: string };

export function AdminMfaForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [start, setStart] = useState<Start | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/admin-auth/mfa/start", {
        method: "POST",
      });
      if (!response.ok) {
        if (!cancelled) setError(t("mfaFailed"));
        return;
      }
      const body = (await response.json()) as Start;
      if (!cancelled) setStart(body);
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!start) return;
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin-auth/mfa/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: data.get("code"),
        factorId: start.factorId,
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError(t("mfaFailed"));
      return;
    }
    const body = (await response.json()) as { recoveryCodes?: string[] | null };
    if (body.recoveryCodes && body.recoveryCodes.length > 0) {
      setCodes(body.recoveryCodes);
      return;
    }
    router.push("/admin");
  }

  async function startPasskey() {
    setError(null);
    const options = await fetch("/api/admin-auth/passkey/options", {
      method: "POST",
    });
    if (!options.ok) {
      setError(t("mfaFailed"));
      return;
    }
    const body = (await options.json()) as {
      factorId: string;
      challengeId: string;
      webauthn: {
        type: "create" | "request";
        credential_options: { publicKey: Record<string, unknown> };
      };
    };
    const credentialApi = PublicKeyCredential as typeof PublicKeyCredential & {
      parseCreationOptionsFromJSON?: (
        options: unknown,
      ) => PublicKeyCredentialCreationOptions;
      parseRequestOptionsFromJSON?: (
        options: unknown,
      ) => PublicKeyCredentialRequestOptions;
    };
    const createOptions = credentialApi.parseCreationOptionsFromJSON?.(
      body.webauthn.credential_options.publicKey,
    );
    const requestOptions = credentialApi.parseRequestOptionsFromJSON?.(
      body.webauthn.credential_options.publicKey,
    );
    const credential =
      body.webauthn.type === "create" && createOptions
        ? await navigator.credentials.create({ publicKey: createOptions })
        : body.webauthn.type === "request" && requestOptions
          ? await navigator.credentials.get({ publicKey: requestOptions })
          : null;
    if (!credential || !("toJSON" in credential)) {
      setError(t("mfaFailed"));
      return;
    }
    const verified = await fetch("/api/admin-auth/passkey/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        factorId: body.factorId,
        challengeId: body.challengeId,
        type: body.webauthn.type,
        credential: (credential as PublicKeyCredential).toJSON(),
      }),
    });
    if (!verified.ok) {
      setError(t("mfaFailed"));
      return;
    }
    router.push("/admin");
  }

  if (codes) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <h2 className="t-h3">{t("recoveryTitle")}</h2>
        <p className="text-fg-muted">{t("recoveryHint")}</p>
        <ul className="t-data flex flex-col gap-1">
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <ButtonLink href="/admin">{t("continueHome")}</ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      {start?.mode === "enroll" && (
        <p className="t-data">
          <span>{t("mfaSecret")}</span>{" "}
          <span data-testid="totp-secret-value">{start.secret}</span>
        </p>
      )}
      <Field label={t("mfaCode")} error={error}>
        <Input
          name="code"
          inputMode="text"
          autoComplete="one-time-code"
          required
        />
      </Field>
      <Button type="submit" disabled={pending || !start}>
        {t("mfaVerify")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => void startPasskey()}
      >
        {t("passkey")}
      </Button>
    </form>
  );
}
