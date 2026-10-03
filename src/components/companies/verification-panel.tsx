"use client";

import { Check, Copy, Save, Send, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { Field, FieldGroup } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
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
  }).catch(() => null);
  const data = ((await response?.json().catch(() => ({}))) ?? {}) as {
    error?: { code?: string };
    dnsRecord?: string;
    emailSent?: boolean;
  };
  return { ok: Boolean(response?.ok), data };
}

/** Three steps of 14.1 as a stepper (DESIGN.md 9.10). */
function Stepper({ steps, labels }: { steps: Steps; labels: string[] }) {
  const done = [
    steps.domainConfirmed,
    steps.requisitesComplete,
    steps.firstJobModerated,
  ];
  const current = done.findIndex((d) => !d);
  return (
    <ol className="grid gap-px border border-line bg-line md:grid-cols-3">
      {labels.map((label, i) => (
        <li
          key={label}
          className={cn(
            "flex gap-4 bg-bg p-5",
            i === current &&
              "outline outline-1 -outline-offset-1 outline-accent",
          )}
        >
          <span
            className={cn(
              "t-data-l",
              done[i] ? "text-success" : "text-fg-subtle",
            )}
          >
            {done[i] ? <Icon icon={Check} size={24} /> : `0${i + 1}`}
          </span>
          <span className="t-body-s text-fg-muted">{label}</span>
        </li>
      ))}
    </ol>
  );
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
  requisites: { legalName: string; country: string; websiteUrl: string };
  initialToken: string;
}) {
  const t = useTranslations("companyVerify");
  const ui = useTranslations("ui");
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
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
    setPending("requisites");
    const { ok, data } = await send(`/api/companies/${companyId}`, "PATCH", {
      legalName: legalName.trim() || null,
      country: country.trim().toUpperCase() || null,
      websiteUrl: websiteUrl.trim() || null,
    });
    setPending(null);
    if (!ok) return toast.show(errorText(data.error?.code), "danger");
    toast.show(t("saved"));
    router.refresh();
  }

  async function request(event: FormEvent) {
    event.preventDefault();
    setPending("request");
    const { ok, data } = await send(
      `/api/companies/${companyId}/verification`,
      "POST",
      method === "corporate_email" ? { method, target: email } : { method },
    );
    setPending(null);
    if (!ok) return toast.show(errorText(data.error?.code), "danger");
    if (data.dnsRecord) {
      setDnsRecord(data.dnsRecord);
      setToken(data.dnsRecord.replace(/^intgetion-verify=/, ""));
      toast.show(t("dnsAdd"));
    } else {
      toast.show(data.emailSent ? t("emailSent") : t("emailNotConfigured"));
    }
    router.refresh();
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setPending("confirm");
    const { ok, data } = await send(
      `/api/companies/${companyId}/verification/confirm`,
      "POST",
      { token },
    );
    setPending(null);
    if (!ok) return toast.show(errorText(data.error?.code), "danger");
    toast.show(t("confirmed"));
    router.refresh();
  }

  async function copy() {
    if (!dnsRecord) return;
    try {
      await navigator.clipboard.writeText(dnsRecord);
      toast.show(ui("copied"));
    } catch {
      // Clipboard blocked: the record stays selectable on the page.
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="verify-steps" className="flex flex-col gap-4">
        <h2 id="verify-steps" className="t-h3">
          {t("stepsTitle")}
        </h2>
        <Stepper
          steps={steps}
          labels={[t("stepDomain"), t("stepRequisites"), t("stepFirstJob")]}
        />
      </section>

      <form
        onSubmit={saveRequisites}
        className="flex max-w-[720px] flex-col gap-6"
      >
        <FieldGroup legend={t("requisitesTitle")}>
          <Field label={t("legalName")}>
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              maxLength={240}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-[120px_1fr]">
            <Field label={t("country")}>
              <Input
                className="t-data uppercase"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={2}
              />
            </Field>
            <Field label={t("website", { domain: domain ?? "—" })}>
              <Input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>
        <Button
          type="submit"
          variant="secondary"
          loading={pending === "requisites"}
          icon={<Icon icon={Save} size={16} />}
          className="self-start"
        >
          {t("saveRequisites")}
        </Button>
      </form>

      {canRequest && (
        <form onSubmit={request} className="flex max-w-[720px] flex-col gap-6">
          <FieldGroup legend={t("requestTitle")}>
            <div
              role="radiogroup"
              aria-label={t("method")}
              className="flex flex-col"
            >
              <Choice
                type="radio"
                name="method"
                checked={method === "corporate_email"}
                onChange={() => setMethod("corporate_email")}
                label={t("methodEmail")}
              />
              <Choice
                type="radio"
                name="method"
                checked={method === "dns_txt"}
                onChange={() => setMethod("dns_txt")}
                label={t("methodDns", { domain: domain ?? "—" })}
              />
            </div>
            {method === "corporate_email" && (
              <Field label={t("email", { domain: domain ?? "—" })} required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            )}
          </FieldGroup>
          <Button
            type="submit"
            loading={pending === "request"}
            icon={<Icon icon={Send} size={16} />}
            className="self-start"
          >
            {t("request")}
          </Button>
        </form>
      )}

      {dnsRecord && (
        <section className="flex max-w-[720px] flex-col gap-3 border border-line-strong p-5">
          <p className="t-label text-fg-muted">{t("dnsRecord")}</p>
          <code className="t-data break-all text-fg">{dnsRecord}</code>
          <Button
            variant="ghost"
            onClick={copy}
            icon={<Icon icon={Copy} size={16} />}
            className="-ml-5 self-start"
          >
            {ui("copy")}
          </Button>
        </section>
      )}

      {canRequest && (
        <form onSubmit={confirm} className="flex max-w-[720px] flex-col gap-6">
          <FieldGroup legend={t("confirmTitle")}>
            <Field label={t("token")}>
              <Input
                className="t-data"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button
            type="submit"
            disabled={token.trim().length < 20}
            loading={pending === "confirm"}
            icon={<Icon icon={ShieldCheck} size={16} />}
            className="self-start"
          >
            {t("confirm")}
          </Button>
        </form>
      )}
    </div>
  );
}
