"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UGC_GOALS, UGC_NICHES, UGC_PLATFORMS, UGC_RIGHTS } from "@/config/ugc";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { localePath } from "@/i18n/paths";
import {
  rewardInLimits,
  ugcBudgetMinor,
  usdLabel,
  type UgcPriceGuide,
} from "../service/pricing";
import type { BriefDraftRow } from "../service";

/** Draft keys the server names in an error, mapped to this form's labels. */
const FIELD_OF: Record<string, string> = {
  companyId: "company",
  productName: "productName",
  description: "productSummary",
  goal: "goal",
  niche: "niches",
  audience: "audience",
  audienceOrCountry: "audience",
  countries: "country",
  languages: "languages",
  platform: "platforms",
  mustSay: "mustSay",
  mustNot: "mustNot",
  videoCount: "videos",
  rewardCents: "bounty",
  deadline: "deadline",
  rights: "rights",
  pitch: "pitch",
  links: "examples",
};

function Step({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-5 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <legend className="float-left flex w-full items-baseline gap-3">
        <span className="t-data text-fg-muted">{`0${index}`}</span>
        <span className="t-h3">{title}</span>
      </legend>
      {hint ? <p className="t-body-s -mt-2 text-fg-muted">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

/**
 * The same fields the bot collects, in five steps, saved into the same
 * brief draft (D492). "Send" saves and confirms; "Save draft" only saves,
 * so Spoki and this form keep one draft. The price guide only suggests; the
 * company sets the reward (D464). Layout and copy: D519.
 */
export function BriefForm({
  companies,
  guide,
  draft,
}: {
  companies: { id: string; name: string }[];
  guide: UgcPriceGuide;
  draft: BriefDraftRow;
}) {
  const t = useTranslations("ugc");
  const d = useTranslations("ugcDesk");
  const locale = useLocale();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<"send" | "save" | null>(null);
  const values = draft.draft;
  const [dollars, setDollars] = useState(
    typeof values.rewardCents === "number"
      ? String(values.rewardCents / 100)
      : "",
  );
  const [videos, setVideos] = useState(
    typeof values.videoCount === "number" ? String(values.videoCount) : "",
  );
  const [rights, setRights] = useState(
    typeof values.rights === "string" ? values.rights : "",
  );
  const rewardMinor = /^\d+$/.test(dollars) ? Number(dollars) * 100 : 0;
  const videoCount = Number.parseInt(videos, 10) || 0;
  const budget = ugcBudgetMinor(videoCount, rewardMinor);

  /** Only filled fields: an empty one is left as it is in the draft. */
  function patchFrom(form: FormData) {
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const list = (key: string, split: RegExp) =>
      text(key)
        .split(split)
        .map((item) => item.trim())
        .filter(Boolean);
    const countries = list("country", /[;,\s]+/).map((item) =>
      item.toUpperCase(),
    );
    const languages = list("languages", /,/);
    const mustSay = list("mustSay", /[;,\n]+/);
    const mustNot = list("mustNot", /[;,\n]+/);
    const links = list("exampleUrls", /\s+/);
    const count = Number(form.get("videosWanted"));
    const patch: Record<string, unknown> = {
      productName: text("productName") || undefined,
      description: text("productSummary") || undefined,
      goal: text("goal") || undefined,
      niche: text("niches") || undefined,
      audience: text("audience") || undefined,
      countries: countries.length ? countries : undefined,
      languages: languages.length ? languages : undefined,
      platform: text("platforms") || undefined,
      mustSay: mustSay.length ? mustSay : undefined,
      mustNot: mustNot.length ? mustNot : undefined,
      videoCount: Number.isInteger(count) && count > 0 ? count : undefined,
      rewardCents: /^\d+$/.test(dollars)
        ? Number(BigInt(dollars) * BigInt(100))
        : undefined,
      deadline: text("deadline") || undefined,
      rights: text("rights") || undefined,
      pitch: text("pitch") || undefined,
      links: links.length ? links : undefined,
    };
    return Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
  }

  async function problem(response: Response): Promise<string> {
    const data = (await response.json().catch(() => null)) as {
      error?: { code?: string; details?: { path?: unknown }[] };
    } | null;
    const path = data?.error?.details?.[0]?.path;
    const key = Array.isArray(path) ? String(path[0]) : String(path ?? "");
    const field = FIELD_OF[key];
    return field
      ? d("form.fieldProblem", { field: t(`fields.${field}`) })
      : t("error");
  }

  async function save(form: HTMLFormElement, mode: "send" | "save") {
    setBusy(mode);
    setError("");
    setSaved(false);
    const data = new FormData(form);
    try {
      const stored = await fetch("/api/ugc/brief-draft", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          companyId: String(data.get("companyId") ?? "") || undefined,
          patch: patchFrom(data),
        }),
      });
      if (!stored.ok) {
        setError(await problem(stored));
        return;
      }
      if (mode === "save") {
        setSaved(true);
        return;
      }
      const response = await fetch("/api/ugc/brief-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "confirm", draftId: draft.id }),
      });
      if (!response.ok) {
        setError(await problem(response));
        return;
      }
      const created = (await response.json()) as { id?: string };
      if (created.id) {
        window.location.assign(localePath(locale, `/campaigns/${created.id}`));
      }
    } catch {
      setError(t("error"));
    } finally {
      setBusy(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(event.currentTarget, "send");
  }

  return (
    <form
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={onSubmit}
      aria-busy={busy !== null}
    >
      <div className="flex min-w-0 flex-col gap-8">
        <Step index={1} title={d("form.product")}>
          <Field label={t("fields.company")} required>
            <Select
              name="companyId"
              defaultValue={draft.companyId ?? companies[0]?.id ?? ""}
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("fields.productName")} required>
            <Input
              name="productName"
              maxLength={120}
              defaultValue={String(values.productName ?? "")}
            />
          </Field>
          <Field
            label={t("fields.productSummary")}
            help={d("form.summaryHelp")}
            required
          >
            <Textarea
              name="productSummary"
              maxLength={400}
              rows={3}
              defaultValue={String(values.description ?? "")}
            />
          </Field>
          <Field label={t("fields.goal")} required>
            <Select name="goal" defaultValue={String(values.goal ?? "")}>
              <option value="" disabled />
              {UGC_GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {t(`goals.${goal}`)}
                </option>
              ))}
            </Select>
          </Field>
        </Step>

        <Step
          index={2}
          title={d("form.audience")}
          hint={d("form.audienceHint")}
        >
          <fieldset className="flex flex-col gap-1">
            <legend className="t-label pb-1 text-fg-muted">
              {t("fields.niches")}
            </legend>
            <div className="grid gap-x-6 sm:grid-cols-2">
              {UGC_NICHES.map((niche) => (
                <Choice
                  key={niche}
                  type="radio"
                  name="niches"
                  value={niche}
                  label={t(`niches.${niche}`)}
                  defaultChecked={values.niche === niche}
                />
              ))}
            </div>
          </fieldset>
          <Field label={t("fields.audience")} help={d("form.audienceHelp")}>
            <Input
              name="audience"
              maxLength={300}
              defaultValue={String(values.audience ?? "")}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("fields.country")} help={d("form.countryHelp")}>
              <Input
                name="country"
                maxLength={60}
                autoComplete="off"
                defaultValue={
                  Array.isArray(values.countries)
                    ? values.countries.join("; ")
                    : ""
                }
              />
            </Field>
            <Field label={t("fields.languages")} help={d("form.languagesHelp")}>
              <Input
                name="languages"
                defaultValue={
                  Array.isArray(values.languages)
                    ? values.languages.join(", ")
                    : ""
                }
              />
            </Field>
          </div>
        </Step>

        <Step index={3} title={d("form.video")}>
          <fieldset className="flex flex-col gap-1">
            <legend className="t-label pb-1 text-fg-muted">
              {t("fields.platforms")}
            </legend>
            <div className="flex flex-wrap gap-x-6">
              {UGC_PLATFORMS.map((platform) => (
                <Choice
                  key={platform}
                  type="radio"
                  name="platforms"
                  value={platform}
                  required
                  label={t(`platforms.${platform}`)}
                  defaultChecked={values.platform === platform}
                />
              ))}
            </div>
          </fieldset>
          <Field
            label={t("fields.videos")}
            help={d("form.videosHelp")}
            required
          >
            <Input
              name="videosWanted"
              type="number"
              min={1}
              max={30}
              inputMode="numeric"
              value={videos}
              onChange={(event) => setVideos(event.target.value)}
            />
          </Field>
          <Field label={t("fields.mustSay")} help={d("form.listHelp")}>
            <Textarea
              name="mustSay"
              maxLength={1000}
              rows={3}
              defaultValue={
                Array.isArray(values.mustSay) ? values.mustSay.join("; ") : ""
              }
            />
          </Field>
          <Field label={t("fields.mustNot")} help={d("form.listHelp")}>
            <Textarea
              name="mustNot"
              maxLength={1000}
              rows={3}
              defaultValue={
                Array.isArray(values.mustNot) ? values.mustNot.join("; ") : ""
              }
            />
          </Field>
        </Step>

        <Step index={4} title={d("form.money")}>
          <Field
            label={t("fields.bounty")}
            help={d("form.bountyHelp")}
            required
          >
            <Input
              name="bounty"
              type="number"
              min={5}
              max={500}
              inputMode="numeric"
              value={dollars}
              onChange={(event) => setDollars(event.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <p className="t-label text-fg-muted">{t("pricePresets")}</p>
            <div className="flex flex-wrap gap-2">
              {guide.presets.map((minor) => (
                <button
                  key={minor}
                  type="button"
                  aria-pressed={rewardMinor === minor}
                  onClick={() => setDollars(String(minor / 100))}
                  className={`t-data min-h-11 rounded-full border px-4 transition-colors duration-[120ms] ${
                    rewardMinor === minor
                      ? "border-fg bg-fg text-bg"
                      : "border-line hover:border-line-strong"
                  }`}
                >
                  {usdLabel(minor)}
                </button>
              ))}
            </div>
            <p className="t-body-s text-fg-muted">
              {t("priceUsual", {
                min: usdLabel(guide.minMinor),
                max: usdLabel(guide.maxMinor),
              })}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("fields.deadline")} required>
              <Input
                name="deadline"
                type="date"
                defaultValue={String(values.deadline ?? "")}
              />
            </Field>
            <Field label={t("fields.rights")} required>
              <Select
                name="rights"
                value={rights}
                onChange={(event) => setRights(event.target.value)}
              >
                <option value="" disabled />
                {UGC_RIGHTS.map((option) => (
                  <option key={option} value={option}>
                    {t(`rights.${option}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {rights !== "organic" ? (
            <p className="t-body-s text-fg-muted">{t("rightsHint")}</p>
          ) : null}
        </Step>

        <Step index={5} title={d("form.extra")} hint={d("form.extraHint")}>
          <Field label={t("fields.pitch")} help={d("form.pitchHelp")}>
            <Textarea
              name="pitch"
              maxLength={300}
              rows={2}
              defaultValue={String(values.pitch ?? "")}
            />
          </Field>
          <Field label={t("fields.examples")} help={d("form.examplesHelp")}>
            <Textarea
              name="exampleUrls"
              rows={2}
              defaultValue={
                Array.isArray(values.links) ? values.links.join("\n") : ""
              }
            />
          </Field>
        </Step>
      </div>

      <aside
        aria-label={d("form.summary")}
        className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24"
      >
        <div className="flex flex-col gap-1">
          <p className="t-label text-fg-muted">{d("form.budget")}</p>
          <p className="t-data-l" aria-live="polite">
            {budget > 0 && rewardInLimits(rewardMinor) ? usdLabel(budget) : "—"}
          </p>
          <p className="t-body-s font-mono text-fg-muted">
            {budget > 0 && rewardInLimits(rewardMinor)
              ? t("budget", {
                  videos: videoCount,
                  price: usdLabel(rewardMinor),
                  total: usdLabel(budget),
                })
              : d("form.budgetEmpty")}
          </p>
        </div>
        <ol className="t-body-s flex flex-col gap-2 border-t border-line pt-4 text-fg-muted">
          <li>{d("form.after1")}</li>
          <li>{d("form.after2")}</li>
          <li>{d("form.after3")}</li>
        </ol>
        {error ? (
          <p className="t-body-s text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="t-body-s text-fg" role="status">
            {d("form.saved")}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            variant="strong"
            disabled={busy !== null}
            loading={busy === "send"}
          >
            {d("form.send")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            loading={busy === "save"}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form) void save(form, "save");
            }}
          >
            {d("form.saveDraft")}
          </Button>
          <p className="t-caption text-fg-muted">{d("form.draftNote")}</p>
        </div>
      </aside>
    </form>
  );
}
