"use client";

import { Send } from "lucide-react";
import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { HIRE_REGION_KEYS, HIRE_REGIONS } from "@/config/hire-regions";
import { EMPLOYMENT_TYPES, JOB_CATEGORIES } from "@/config/markers";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";

type Text = {
  intro: string;
  company: string;
  companyHelp: string;
  title: string;
  description: string;
  location: string;
  locationHelp: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  period: string;
  periods: { month: string; year: string };
  countries: string;
  countriesHelp: string;
  regions: Record<(typeof HIRE_REGION_KEYS)[number], string>;
  category: string;
  employment: string;
  application: string;
  methods: Record<"internal" | "email" | "external_url", string>;
  applicationEmail: string;
  applicationEmailHelp: string;
  applicationUrl: string;
  website: string;
  logo: string;
  logoHelp: string;
  logoError: string;
  x: string;
  telegram: string;
  manager: string;
  firstName: string;
  lastName: string;
  questions: string;
  questionsHelp: string;
  question: string;
  introLive: string;
  reviewNote: string;
  reviewNoteLive: string;
  submit: string;
  submitLive: string;
  submitting: string;
  submittingLive: string;
  error: string;
  completePrivate: string;
  alreadySubmitted: string;
  chooseOption: string;
};

export function HireForm({
  companyId,
  companyName,
  logoSrc,
  publishes,
  text,
  categories,
  employment,
  sharedDraft,
}: {
  companyId: string | null;
  companyName: string;
  logoSrc: string | null;
  publishes: boolean;
  text: Text;
  categories: Record<string, string>;
  employment: Record<string, string>;
  sharedDraft?: {
    id: string;
    draft: Record<string, unknown>;
    status: "draft" | "submitting" | "submitted";
    submittedJobId: string | null;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(logoSrc);
  const [error, setError] = useState<string | null>(null);
  const saved = sharedDraft?.draft ?? {};
  const value = (key: string) => String(saved[key] ?? "");
  const [countries, setCountries] = useState(
    Array.isArray(saved.countries) ? saved.countries.join(", ") : "",
  );
  const [method, setMethod] = useState<string>(
    value("applicationMethod") || (sharedDraft ? "" : "email"),
  );
  const [questions, setQuestions] = useState(
    Array.isArray(saved.questions)
      ? [
          String(saved.questions[0] ?? ""),
          String(saved.questions[1] ?? ""),
          String(saved.questions[2] ?? ""),
        ]
      : ["", "", ""],
  );

  function toggleRegion(key: (typeof HIRE_REGION_KEYS)[number]) {
    const current = new Set(
      countries
        .split(/[^A-Za-z]+/)
        .map((code) => code.toUpperCase())
        .filter((code) => code.length === 2),
    );
    const region = HIRE_REGIONS[key];
    const allOn = region.every((code) => current.has(code));
    for (const code of region) {
      if (allOn) current.delete(code);
      else current.add(code);
    }
    setCountries([...current].join(", "));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? "");
    const payload = {
      companyId,
      companyName: read("companyName"),
      title: read("title"),
      description: read("description"),
      category: read("category"),
      employmentType: read("employmentType"),
      location: read("location"),
      salaryMin: read("salaryMin").replace(/[^\d]/g, ""),
      salaryMax: read("salaryMax").replace(/[^\d]/g, ""),
      salaryCurrency: read("salaryCurrency"),
      salaryPeriod: read("salaryPeriod"),
      countries: countries
        .split(/[^A-Za-z]+/)
        .map((code) => code.toUpperCase())
        .filter((code) => code.length === 2),
      ...(method ? { applicationMethod: method } : {}),
      applicationEmail: read("applicationEmail") || undefined,
      applicationUrl: read("applicationUrl") || undefined,
      website: read("website") || undefined,
      xHandle: read("xHandle") || undefined,
      telegram: read("telegram") || undefined,
      firstName: read("firstName"),
      lastName: read("lastName"),
      questions: questions.map((item) => item.trim()).filter(Boolean),
    };
    try {
      let result: { job: { companyId: string } };
      if (sharedDraft) {
        const patch: Record<string, unknown> = { ...payload };
        delete patch.companyId;
        const savedDraft = await fetch("/api/jobs/draft", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ draftId: sharedDraft.id, patch }),
        });
        if (!savedDraft.ok) throw new Error(text.error);
        const response = await fetch("/api/jobs/draft", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "confirm", draftId: sharedDraft.id }),
        });
        if (!response.ok) throw new Error(text.error);
        const submission = (await response.json()) as {
          submitted?: boolean;
          companyId?: string;
        };
        if (!submission.submitted) {
          setError(text.completePrivate);
          setSaving(false);
          return;
        }
        result = {
          job: { companyId: submission.companyId ?? companyId ?? "" },
        };
      } else {
        const response = await fetch("/api/hire", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(text.error);
        result = (await response.json()) as { job: { companyId: string } };
      }
      const logo = data.get("logo");
      if (logo instanceof File && logo.size > 0) {
        const picture = new FormData();
        picture.set("file", logo);
        const uploaded = await fetch(
          `/api/companies/${result.job.companyId}/logo`,
          { method: "POST", body: picture },
        );
        if (!uploaded.ok) toast.show(text.logoError, "danger");
      }
      router.push({
        pathname: "/employer/jobs",
        query: { tab: publishes ? "published" : "moderation" },
      });
    } catch {
      setError(text.error);
      setSaving(false);
    }
  }

  if (sharedDraft?.status === "submitted")
    return (
      <div className="flex max-w-[720px] flex-col gap-4">
        <p>{text.alreadySubmitted}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/employer/jobs")}
        >
          {text.submitLive}
        </Button>
      </div>
    );
  if (sharedDraft?.status === "submitting")
    return <p className="max-w-[60ch] text-fg-muted">{text.submittingLive}</p>;

  return (
    <form className="flex max-w-[720px] flex-col gap-10" onSubmit={submit}>
      <p className="max-w-[60ch] text-fg-muted">
        {publishes ? text.introLive : text.intro}
      </p>
      <FieldGroup legend={text.title}>
        <Field label={text.title} required>
          <Input
            name="title"
            required
            minLength={3}
            maxLength={140}
            defaultValue={value("title")}
          />
        </Field>
        <Field label={text.company} help={text.companyHelp} required>
          <Input
            name="companyName"
            required
            minLength={2}
            maxLength={160}
            defaultValue={value("companyName") || companyName}
          />
        </Field>
        <Field label={text.description} required>
          <Textarea
            name="description"
            required
            minLength={50}
            maxLength={20000}
            className="min-h-60"
            defaultValue={value("description")}
          />
        </Field>
      </FieldGroup>

      <FieldGroup legend={text.location}>
        <Field label={text.location} help={text.locationHelp}>
          <Input
            name="location"
            maxLength={200}
            defaultValue={value("location")}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={text.category}>
            <Select
              name="category"
              required
              defaultValue={
                value("category") || (sharedDraft ? "" : "engineering")
              }
            >
              <option value="" disabled>
                {text.chooseOption}
              </option>
              {JOB_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {categories[value] ?? value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={text.employment}>
            <Select
              name="employmentType"
              required
              defaultValue={
                value("employmentType") || (sharedDraft ? "" : "full_time")
              }
            >
              <option value="" disabled>
                {text.chooseOption}
              </option>
              {EMPLOYMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {employment[value] ?? value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup legend={text.salaryMin}>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label={text.salaryMin} required>
            <Input
              name="salaryMin"
              required
              inputMode="numeric"
              defaultValue={value("salaryMin")}
            />
          </Field>
          <Field label={text.salaryMax} required>
            <Input
              name="salaryMax"
              required
              inputMode="numeric"
              defaultValue={value("salaryMax")}
            />
          </Field>
          <Field label={text.currency} required>
            <Input
              name="salaryCurrency"
              required
              defaultValue={
                value("salaryCurrency") || (sharedDraft ? "" : "USD")
              }
              maxLength={3}
              className="uppercase"
            />
          </Field>
          <Field label={text.period}>
            <Select
              name="salaryPeriod"
              required
              defaultValue={
                value("salaryPeriod") || (sharedDraft ? "" : "year")
              }
            >
              <option value="" disabled>
                {text.chooseOption}
              </option>
              <option value="year">{text.periods.year}</option>
              <option value="month">{text.periods.month}</option>
            </Select>
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup legend={text.countries}>
        <Field label={text.countries} help={text.countriesHelp}>
          <Input
            value={countries}
            onChange={(event) => setCountries(event.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          {HIRE_REGION_KEYS.map((key) => (
            <Button
              key={key}
              type="button"
              variant="secondary"
              onClick={() => toggleRegion(key)}
            >
              {text.regions[key]}
            </Button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup legend={text.application}>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm">{text.application}</legend>
          {(["email", "external_url", "internal"] as const).map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="applicationMethod"
                checked={method === value}
                required={value === "internal"}
                onChange={() => setMethod(value)}
              />
              {text.methods[value]}
            </label>
          ))}
        </fieldset>
        {method === "email" ? (
          <Field
            label={text.applicationEmail}
            help={text.applicationEmailHelp}
            required
          >
            <Input
              name="applicationEmail"
              type="email"
              required
              maxLength={320}
              defaultValue={value("applicationEmail")}
            />
          </Field>
        ) : null}
        {method === "external_url" ? (
          <Field label={text.applicationUrl} required>
            <Input
              name="applicationUrl"
              required
              maxLength={2048}
              defaultValue={value("applicationUrl")}
            />
          </Field>
        ) : null}
      </FieldGroup>

      <FieldGroup legend={text.website}>
        <Field label={text.website}>
          <Input
            name="website"
            maxLength={2048}
            defaultValue={value("website")}
          />
        </Field>
        <Field label={text.logo} help={text.logoHelp}>
          <Input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="py-2 file:mr-4 file:border-0 file:bg-transparent file:rounded-full file:font-medium file:text-[14px] file:text-fg"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setPreview((current) => {
                if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                return url;
              });
            }}
          />
        </Field>
        {preview ? (
          <Image
            src={preview}
            alt=""
            width={96}
            height={96}
            unoptimized
            className="size-24 border border-line object-cover"
          />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={text.x}>
            <Input
              name="xHandle"
              maxLength={40}
              defaultValue={value("xHandle")}
            />
          </Field>
          <Field label={text.telegram}>
            <Input
              name="telegram"
              maxLength={40}
              defaultValue={value("telegram")}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup legend={text.manager}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={text.firstName} required>
            <Input
              name="firstName"
              required
              maxLength={80}
              defaultValue={value("firstName")}
            />
          </Field>
          <Field label={text.lastName} required>
            <Input
              name="lastName"
              required
              maxLength={80}
              defaultValue={value("lastName")}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup legend={text.questions}>
        <p className="text-sm text-fg-muted">{text.questionsHelp}</p>
        {questions.map((value, index) => (
          <Field
            key={index}
            label={text.question.replace("{n}", String(index + 1))}
          >
            <Input
              value={value}
              maxLength={300}
              onChange={(event) =>
                setQuestions(
                  questions.map((item, itemIndex) =>
                    itemIndex === index ? event.target.value : item,
                  ),
                )
              }
            />
          </Field>
        ))}
      </FieldGroup>

      <p className="max-w-[60ch] text-sm text-fg-muted">
        {publishes ? text.reviewNoteLive : text.reviewNote}
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        type="submit"
        loading={saving}
        icon={<Icon icon={Send} size={16} />}
      >
        {saving
          ? publishes
            ? text.submittingLive
            : text.submitting
          : publishes
            ? text.submitLive
            : text.submit}
      </Button>
    </form>
  );
}
