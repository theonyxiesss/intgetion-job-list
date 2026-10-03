"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";

type Steps = {
  domainConfirmed: boolean;
  requisitesComplete: boolean;
  firstJobModerated: boolean;
};

async function send(path: string, method: string, body: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: { code?: string };
    dnsRecord?: string;
    emailSent?: boolean;
  };
  return { ok: response.ok, data };
}

export function VerificationPanel({
  companyId,
  domain,
  companyStatus,
  steps,
  requisites,
  initialToken,
}: {
  companyId: string;
  domain: string | null;
  companyStatus: string;
  steps: Steps;
  requisites: {
    legalName: string;
    country: string;
    websiteUrl: string;
  };
  initialToken: string;
}) {
  const t = useTranslations("companyVerify");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dnsRecord, setDnsRecord] = useState<string | null>(null);
  const [method, setMethod] = useState<"corporate_email" | "dns_txt">(
    "corporate_email",
  );
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken);
  const [legalName, setLegalName] = useState(requisites.legalName);
  const [country, setCountry] = useState(requisites.country);
  const [websiteUrl, setWebsiteUrl] = useState(requisites.websiteUrl);
  const canRequest =
    companyStatus === "unverified" || companyStatus === "rejected";

  function errorText(code?: string) {
    const known = [
      "FREE_EMAIL_DOMAIN",
      "DOMAIN_MISMATCH",
      "DOMAIN_REQUIRED",
      "REAPPLY_TOO_SOON",
      "TOKEN_EXPIRED",
      "DNS_RECORD_NOT_FOUND",
      "RATE_LIMITED",
    ];
    return code && known.includes(code) ? t(`errors.${code}`) : t("failed");
  }

  async function saveRequisites(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    const { ok, data } = await send(`/api/companies/${companyId}`, "PATCH", {
      legalName: legalName.trim() || null,
      country: country.trim().toUpperCase() || null,
      websiteUrl: websiteUrl.trim() || null,
    });
    setPending(false);
    setMessage(ok ? t("saved") : errorText(data.error?.code));
    if (ok) router.refresh();
  }

  async function request(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    const { ok, data } = await send(
      `/api/companies/${companyId}/verification`,
      "POST",
      method === "corporate_email" ? { method, target: email } : { method },
    );
    setPending(false);
    if (!ok) {
      setMessage(errorText(data.error?.code));
      return;
    }
    if (data.dnsRecord) {
      setDnsRecord(data.dnsRecord);
      setToken(data.dnsRecord.replace(/^intgetion-verify=/, ""));
      setMessage(t("dnsAdd"));
    } else {
      setMessage(data.emailSent ? t("emailSent") : t("emailNotConfigured"));
    }
    router.refresh();
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    const { ok, data } = await send(
      `/api/companies/${companyId}/verification/confirm`,
      "POST",
      { token },
    );
    setPending(false);
    setMessage(ok ? t("confirmed") : errorText(data.error?.code));
    if (ok) router.refresh();
  }

  const mark = (done: boolean) => (done ? "✓" : "—");

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="verify-steps">
        <h2 id="verify-steps" className="text-xl font-semibold">
          {t("stepsTitle")}
        </h2>
        <ol className="mt-2 list-decimal pl-6">
          <li>
            {t("stepDomain")}: {mark(steps.domainConfirmed)}
          </li>
          <li>
            {t("stepRequisites")}: {mark(steps.requisitesComplete)}
          </li>
          <li>
            {t("stepFirstJob")}: {mark(steps.firstJobModerated)}
          </li>
        </ol>
      </section>

      <form onSubmit={saveRequisites} className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("requisitesTitle")}</h2>
        <label className="flex flex-col gap-1">
          {t("legalName")}
          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            maxLength={240}
            className="min-h-11 rounded-md border border-current/30 bg-transparent px-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("country")}
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={2}
            className="min-h-11 rounded-md border border-current/30 bg-transparent px-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("website", { domain: domain ?? "—" })}
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="min-h-11 rounded-md border border-current/30 bg-transparent px-2"
          />
        </label>
        <button
          disabled={pending}
          className="min-h-11 self-start rounded-md border border-current px-4"
        >
          {t("saveRequisites")}
        </button>
      </form>

      {canRequest && (
        <form onSubmit={request} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{t("requestTitle")}</h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{t("method")}</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                checked={method === "corporate_email"}
                onChange={() => setMethod("corporate_email")}
              />
              {t("methodEmail")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                checked={method === "dns_txt"}
                onChange={() => setMethod("dns_txt")}
              />
              {t("methodDns", { domain: domain ?? "—" })}
            </label>
          </fieldset>
          {method === "corporate_email" && (
            <label className="flex flex-col gap-1">
              {t("email", { domain: domain ?? "—" })}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-11 rounded-md border border-current/30 bg-transparent px-2"
              />
            </label>
          )}
          <button
            disabled={pending}
            className="min-h-11 self-start rounded-md border border-current px-4"
          >
            {t("request")}
          </button>
        </form>
      )}

      {dnsRecord && (
        <p>
          {t("dnsRecord")}{" "}
          <code className="break-all font-mono text-sm">{dnsRecord}</code>
        </p>
      )}

      {canRequest && (
        <form onSubmit={confirm} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{t("confirmTitle")}</h2>
          <label className="flex flex-col gap-1">
            {t("token")}
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="min-h-11 rounded-md border border-current/30 bg-transparent px-2 font-mono"
            />
          </label>
          <button
            disabled={pending || token.trim().length < 20}
            className="min-h-11 self-start rounded-md border border-current px-4"
          >
            {t("confirm")}
          </button>
        </form>
      )}

      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
