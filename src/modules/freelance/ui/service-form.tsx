"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { FREELANCE_CATEGORIES, FREELANCE_TIERS } from "@/config/freelance";
import { callApi, errorText, type ClientCopy } from "./client-api";

type Tier = (typeof FREELANCE_TIERS)[number];

export type PackageDraft = {
  on: boolean;
  price: string;
  days: string;
  revisions: string;
  includes: string;
};

export type ServiceDraft = {
  title: string;
  category: string;
  description: string;
  buyerNeeds: string;
  languages: string;
  skills: string;
  links: string;
  packages: Record<Tier, PackageDraft>;
};

export const EMPTY_DRAFT: ServiceDraft = {
  title: "",
  category: "development",
  description: "",
  buyerNeeds: "",
  languages: "",
  skills: "",
  links: "",
  packages: {
    basic: { on: true, price: "", days: "", revisions: "1", includes: "" },
    standard: { on: false, price: "", days: "", revisions: "2", includes: "" },
    pro: { on: false, price: "", days: "", revisions: "3", includes: "" },
  },
};

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
const commas = (text: string) =>
  text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

/** Path of an error detail: ["packages", 0, "price"] → "packages.0.price". */
function pathOf(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const path = (detail as { path?: unknown }).path;
  if (Array.isArray(path)) return path.join(".");
  return typeof path === "string" ? path : null;
}

/** Writes or edits one service (28.3). The server checks every rule again. */
export function ServiceForm({
  copy,
  initial,
  serviceId,
}: {
  copy: ClientCopy;
  initial: ServiceDraft;
  serviceId?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ServiceDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bad, setBad] = useState<Set<string>>(new Set());

  const set = (key: keyof ServiceDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setPackage = (
    tier: Tier,
    key: keyof PackageDraft,
    value: string | boolean,
  ) =>
    setDraft((current) => ({
      ...current,
      packages: {
        ...current.packages,
        [tier]: { ...current.packages[tier], [key]: value },
      },
    }));
  const flag = (path: string) =>
    [...bad].some((item) => item === path || item.startsWith(`${path}.`))
      ? (copy.fieldBad ?? "")
      : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setBad(new Set());
    const tiers = FREELANCE_TIERS.filter((tier) => draft.packages[tier].on);
    const body = {
      title: draft.title,
      category: draft.category,
      description: draft.description,
      buyerNeeds: draft.buyerNeeds,
      languages: commas(draft.languages.toLowerCase()),
      skills: commas(draft.skills),
      links: lines(draft.links),
      packages: tiers.map((tier) => ({
        tier,
        price: draft.packages[tier].price
          .replace(",", ".")
          .replace(/[$\s]/g, ""),
        deliveryDays: Number(draft.packages[tier].days),
        revisions: Number(draft.packages[tier].revisions),
        includes: lines(draft.packages[tier].includes),
      })),
    };
    const result = serviceId
      ? await callApi(`/api/freelance/services/${serviceId}`, body, "PUT")
      : await callApi("/api/freelance/services", body);
    setBusy(false);
    if (!result.ok) {
      const details = result.details;
      const paths = new Set<string>();
      if (Array.isArray(details)) {
        for (const detail of details) {
          const path = pathOf(detail);
          if (path) paths.add(path);
        }
      } else if (details && typeof details === "object") {
        const fields = (details as { fields?: unknown }).fields;
        if (Array.isArray(fields))
          for (const field of fields) paths.add(String(field));
      }
      setBad(paths);
      setError(errorText(copy, result.code));
      return;
    }
    router.push("/profile/freelance");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8" noValidate>
      <FieldGroup legend={copy.serviceLegend ?? ""}>
        <Field
          label={copy.title ?? ""}
          help={copy.titleHint}
          error={flag("title")}
          required
        >
          <Input
            value={draft.title}
            maxLength={80}
            required
            onChange={(event) => set("title", event.target.value)}
          />
        </Field>
        <Field label={copy.category ?? ""} required>
          <Select
            value={draft.category}
            onChange={(event) => set("category", event.target.value)}
          >
            {FREELANCE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {copy[`category_${category}`] ?? category}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={copy.description ?? ""}
          help={copy.descriptionHint}
          error={flag("description")}
          required
        >
          <Textarea
            value={draft.description}
            rows={6}
            maxLength={1500}
            required
            onChange={(event) => set("description", event.target.value)}
          />
        </Field>
        <Field
          label={copy.buyerNeeds ?? ""}
          help={copy.buyerNeedsHint}
          error={flag("buyerNeeds")}
        >
          <Textarea
            value={draft.buyerNeeds}
            rows={3}
            maxLength={800}
            onChange={(event) => set("buyerNeeds", event.target.value)}
          />
        </Field>
        <Field
          label={copy.languages ?? ""}
          help={copy.languagesHint}
          error={flag("languages")}
          required
        >
          <Input
            value={draft.languages}
            required
            onChange={(event) => set("languages", event.target.value)}
          />
        </Field>
        <Field
          label={copy.skills ?? ""}
          help={copy.skillsHint}
          error={flag("skills") ?? flag("skillSlugs")}
        >
          <Input
            value={draft.skills}
            onChange={(event) => set("skills", event.target.value)}
          />
        </Field>
        <Field
          label={copy.links ?? ""}
          help={copy.linksHint}
          error={flag("links")}
        >
          <Textarea
            value={draft.links}
            rows={3}
            onChange={(event) => set("links", event.target.value)}
          />
        </Field>
      </FieldGroup>
      <FieldGroup legend={copy.packagesLegend ?? ""}>
        <p className="t-body-s text-fg-muted">{copy.packagesHint}</p>
        {FREELANCE_TIERS.map((tier, index) => {
          const pkg = draft.packages[tier];
          const position = FREELANCE_TIERS.filter(
            (other, otherIndex) =>
              otherIndex < index && draft.packages[other].on,
          ).length;
          const at = `packages.${position}`;
          return (
            <div
              key={tier}
              className="flex flex-col gap-4 rounded-lg border border-line p-4"
            >
              {tier === "basic" ? (
                <h3 className="t-h3">{copy[`tier_${tier}`]}</h3>
              ) : (
                <Choice
                  label={copy[`tier_${tier}`] ?? tier}
                  checked={pkg.on}
                  onChange={(event) =>
                    setPackage(tier, "on", event.target.checked)
                  }
                />
              )}
              {pkg.on ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field
                      label={copy.price ?? ""}
                      error={pkg.on ? flag(`${at}.price`) : null}
                      required
                    >
                      <Input
                        value={pkg.price}
                        inputMode="decimal"
                        required
                        onChange={(event) =>
                          setPackage(tier, "price", event.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label={copy.days ?? ""}
                      error={flag(`${at}.deliveryDays`)}
                      required
                    >
                      <Input
                        value={pkg.days}
                        inputMode="numeric"
                        required
                        onChange={(event) =>
                          setPackage(tier, "days", event.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label={copy.revisions ?? ""}
                      error={flag(`${at}.revisions`)}
                      required
                    >
                      <Input
                        value={pkg.revisions}
                        inputMode="numeric"
                        required
                        onChange={(event) =>
                          setPackage(tier, "revisions", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field
                    label={copy.includes ?? ""}
                    help={copy.includesHint}
                    error={flag(`${at}.includes`)}
                    required
                  >
                    <Textarea
                      value={pkg.includes}
                      rows={3}
                      required
                      onChange={(event) =>
                        setPackage(tier, "includes", event.target.value)
                      }
                    />
                  </Field>
                </>
              ) : null}
            </div>
          );
        })}
      </FieldGroup>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy}>
          {copy.saveDraft}
        </Button>
      </div>
      <p className="t-body-s text-fg-muted">{copy.saveNote}</p>
    </form>
  );
}
