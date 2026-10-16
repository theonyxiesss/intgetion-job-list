"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UGC_GOALS, UGC_NICHES, UGC_PLATFORMS, UGC_RIGHTS } from "@/config/ugc";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { localePath } from "@/i18n/paths";

/** The same fields the bot collects. Sending calls createCampaign. */
export function BriefForm({ companies }: { companies: { id: string; name: string }[] }) {
  const t = useTranslations("ugc");
  const locale = useLocale();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const dollars = String(form.get("bounty") ?? "");
    if (!/^\d+$/.test(dollars)) {
      setBusy(false);
      setError(t("error"));
      return;
    }
    const country = String(form.get("country") ?? "").trim();
    const body = {
      action: "create",
      companyId: String(form.get("companyId") ?? ""),
      productName: String(form.get("productName") ?? ""),
      productSummary: String(form.get("productSummary") ?? ""),
      goal: String(form.get("goal") ?? ""),
      niches: form.getAll("niches").map(String),
      audience: String(form.get("audience") ?? ""),
      country: country ? country.toUpperCase() : null,
      languages: String(form.get("languages") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      mustSay: String(form.get("mustSay") ?? ""),
      mustNot: String(form.get("mustNot") ?? ""),
      platforms: form.getAll("platforms").map(String),
      videosWanted: Number(form.get("videosWanted")),
      bountyMinor: (BigInt(dollars) * BigInt(100)).toString(),
      deadline: String(form.get("deadline") ?? ""),
      rights: String(form.get("rights") ?? ""),
      pitch: String(form.get("pitch") ?? ""),
      exampleUrls: String(form.get("exampleUrls") ?? "")
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!response.ok) {
      setError(t("error"));
      return;
    }
    const data = (await response.json()) as { id?: string };
    if (data.id) {
      window.location.assign(localePath(locale, `/campaigns/${data.id}`));
    }
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={onSubmit}>
      <Field label={t("fields.company")}>
        <Select name="companyId" required defaultValue={companies[0]?.id ?? ""}>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("fields.productName")}>
        <Input name="productName" required maxLength={120} />
      </Field>
      <Field label={t("fields.productSummary")}>
        <Input name="productSummary" required maxLength={400} />
      </Field>
      <Field label={t("fields.goal")}>
        <Select name="goal" required defaultValue="awareness">
          {UGC_GOALS.map((goal) => (
            <option key={goal} value={goal}>
              {t(`goals.${goal}`)}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="t-label text-fg-muted">{t("fields.niches")}</legend>
        {UGC_NICHES.map((niche) => (
          <label key={niche} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="niches" value={niche} />
            {t(`niches.${niche}`)}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="t-label text-fg-muted">{t("fields.platforms")}</legend>
        {UGC_PLATFORMS.map((platform) => (
          <label key={platform} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="platforms" value={platform} />
            {t(`platforms.${platform}`)}
          </label>
        ))}
      </fieldset>
      <Field label={t("fields.audience")}>
        <Input name="audience" required maxLength={300} />
      </Field>
      <Field label={t("fields.country")}>
        <Input name="country" maxLength={2} autoComplete="country" />
      </Field>
      <Field label={t("fields.languages")}>
        <Input name="languages" required />
      </Field>
      <Field label={t("fields.mustSay")}>
        <Input name="mustSay" required maxLength={1000} />
      </Field>
      <Field label={t("fields.mustNot")}>
        <Input name="mustNot" required maxLength={1000} />
      </Field>
      <Field label={t("fields.videos")}>
        <Input name="videosWanted" type="number" required min={1} max={30} defaultValue={1} />
      </Field>
      <Field label={t("fields.bounty")}>
        <Input name="bounty" type="number" required min={5} max={500} inputMode="numeric" />
      </Field>
      <Field label={t("fields.deadline")}>
        <Input name="deadline" type="date" required />
      </Field>
      <Field label={t("fields.rights")}>
        <Select name="rights" required defaultValue="organic">
          {UGC_RIGHTS.map((rights) => (
            <option key={rights} value={rights}>
              {t(`rights.${rights}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("fields.pitch")}>
        <Input name="pitch" maxLength={300} />
      </Field>
      <Field label={t("fields.examples")}>
        <Input name="exampleUrls" />
      </Field>
      {error ? (
        <p className="t-body-s text-fg" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} aria-busy={busy}>
        {t("newBrief")}
      </Button>
    </form>
  );
}
