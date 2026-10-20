"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import {
  formatLanguages,
  parseLanguages,
  type LanguageEntry,
} from "./languages";

export type SharedProfileValues = {
  displayName: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  languages: LanguageEntry[];
  about: string | null;
};

/** The "about me" block of the account page (D504). */
export function SharedProfileForm({
  initial,
}: {
  initial: SharedProfileValues;
}) {
  const t = useTranslations("account.profile");
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const read = (name: string) => String(form.get(name) ?? "").trim();
    const languages = parseLanguages(read("languages"));
    if (!languages) {
      setLanguageError(t("languagesError"));
      return;
    }
    setLanguageError(null);
    setFormError(null);
    setBusy(true);
    const response = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: read("displayName") || null,
        country: read("country") || null,
        city: read("city") || null,
        timezone: read("timezone") || null,
        languages,
        about: read("about") || null,
      }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setFormError(t("failed"));
      return;
    }
    toast.show(t("saved"));
    router.refresh();
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
      aria-busy={busy}
      noValidate
    >
      <Field label={t("displayName")} help={t("displayNameHelp")}>
        <Input
          name="displayName"
          defaultValue={initial.displayName ?? ""}
          maxLength={120}
          autoComplete="name"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("country")} help={t("countryHelp")}>
          <Input
            name="country"
            defaultValue={initial.country ?? ""}
            maxLength={2}
            autoComplete="country"
            className="font-mono uppercase"
          />
        </Field>
        <Field label={t("city")}>
          <Input
            name="city"
            defaultValue={initial.city ?? ""}
            maxLength={120}
            autoComplete="address-level2"
          />
        </Field>
      </div>
      <Field label={t("timezone")} help={t("timezoneHelp")}>
        <Input
          name="timezone"
          defaultValue={initial.timezone ?? ""}
          maxLength={64}
          className="font-mono"
        />
      </Field>
      <Field
        label={t("languages")}
        help={t("languagesHelp")}
        error={languageError}
      >
        <Input
          name="languages"
          defaultValue={formatLanguages(initial.languages)}
          className="font-mono"
        />
      </Field>
      <Field label={t("about")}>
        <Textarea
          name="about"
          defaultValue={initial.about ?? ""}
          maxLength={1000}
          rows={3}
        />
      </Field>
      {formError ? (
        <p role="alert" className="t-body-s text-danger">
          {formError}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} className="self-start">
        {busy ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
