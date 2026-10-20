"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { UGC_NICHES, UGC_PLATFORMS } from "@/config/ugc";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** What the form starts with: the own profile, or the shared one (D504). */
export type CreatorFormDefaults = {
  displayName: string;
  languages: readonly string[];
  platforms: readonly string[];
  niches: readonly string[];
  country: string | null;
  exampleUrls: readonly string[];
  inviteOptIn: boolean;
  paused: boolean;
};

export function ProfileForm({ defaults }: { defaults?: CreatorFormDefaults }) {
  const t = useTranslations("ugc");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const country = String(form.get("country") ?? "").trim();
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "profile",
        displayName: String(form.get("displayName") ?? ""),
        languages: String(form.get("languages") ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        platforms: form.getAll("platforms").map(String),
        niches: form.getAll("niches").map(String),
        country: country ? country.toUpperCase() : null,
        exampleUrls: String(form.get("exampleUrls") ?? "")
          .split(/\s+/)
          .filter(Boolean),
        inviteOptIn: form.get("inviteOptIn") === "on",
        status: form.get("paused") === "on" ? "paused" : "active",
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setError(t("error"));
      return;
    }
    window.location.reload();
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={onSubmit}>
      <Field label={t("fields.displayName")}>
        <Input
          name="displayName"
          required
          maxLength={80}
          defaultValue={defaults?.displayName ?? ""}
        />
      </Field>
      <Field label={t("fields.languages")}>
        <Input
          name="languages"
          required
          defaultValue={defaults?.languages.join(", ") ?? ""}
        />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="t-label text-fg-muted">
          {t("fields.platforms")}
        </legend>
        {UGC_PLATFORMS.map((platform) => (
          <label key={platform} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="platforms"
              value={platform}
              defaultChecked={defaults?.platforms.includes(platform)}
            />
            {t(`platforms.${platform}`)}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="t-label text-fg-muted">{t("fields.niches")}</legend>
        {UGC_NICHES.map((niche) => (
          <label key={niche} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="niches"
              value={niche}
              defaultChecked={defaults?.niches.includes(niche)}
            />
            {t(`niches.${niche}`)}
          </label>
        ))}
      </fieldset>
      <Field label={t("fields.country")}>
        <Input
          name="country"
          maxLength={2}
          autoComplete="country"
          defaultValue={defaults?.country ?? ""}
        />
      </Field>
      <Field label={t("fields.examples")}>
        <Input
          name="exampleUrls"
          defaultValue={defaults?.exampleUrls.join(" ") ?? ""}
        />
      </Field>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          name="inviteOptIn"
          defaultChecked={defaults?.inviteOptIn}
        />
        {t("fields.inviteOptIn")}
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          name="paused"
          defaultChecked={defaults?.paused}
        />
        {t("fields.paused")}
      </label>
      {error ? (
        <p role="alert" className="t-body-s">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} aria-busy={busy}>
        {t("profileSave")}
      </Button>
    </form>
  );
}
