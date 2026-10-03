"use client";

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Button,
  Field,
  FieldGroup,
  Icon,
  Input,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import type { toJobDto } from "../api/dto";

type JobDto = ReturnType<typeof toJobDto>;
type Text = {
  title: string;
  description: string;
  category: string;
  employmentType: string;
  workFormat: string;
  location: string;
  applicationMethod: string;
  applicationUrl: string;
  applicationEmail: string;
  salaryCurrency: string;
  salaryMin: string;
  salaryMax: string;
  skills: string;
  save: string;
  saving: string;
  error: string;
  saved: string;
  groups: {
    basics: string;
    details: string;
    application: string;
    salary: string;
    skills: string;
  };
  methods: Record<"internal" | "external_url" | "email", string>;
};

/** Translated labels for enum options; the raw value is the fallback. */
export type JobFormOptions = {
  categories: Record<string, string>;
  employment: Record<string, string>;
  formats: Record<string, string>;
};

const CATEGORIES = [
  "engineering",
  "data",
  "design",
  "product",
  "marketing",
  "sales",
  "support",
  "operations",
  "finance",
  "hr",
] as const;

export function JobForm({
  companyId,
  initial,
  text,
  options,
}: {
  companyId: string;
  initial?: JobDto;
  text: Text;
  options: JobFormOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "engineering",
    employmentType: initial?.employmentType ?? "full_time",
    workFormat: initial?.workFormat ?? "remote",
    location: initial?.location ?? "",
    applicationMethod: initial?.applicationMethod ?? "internal",
    applicationUrl: initial?.applicationUrl ?? "",
    applicationEmail: initial?.applicationEmail ?? "",
    salaryCurrency:
      initial?.salaryMax?.currency ?? initial?.salaryMin?.currency ?? "",
    salaryMin: initial?.salaryMin?.amountMinor ?? "",
    salaryMax: initial?.salaryMax?.amountMinor ?? "",
    skills: "",
  });
  const set =
    (name: keyof typeof form) => (event: { target: { value: string } }) =>
      setForm({ ...form, [name]: event.target.value });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      companyId,
      location: form.location || null,
      applicationUrl: form.applicationUrl || null,
      applicationEmail: form.applicationEmail || null,
      salaryMin: form.salaryMin || null,
      salaryMax: form.salaryMax || null,
      salaryCurrency: form.salaryCurrency || null,
      salaryPeriod: form.salaryCurrency ? "month" : null,
      salaryBasis: form.salaryCurrency ? "gross" : null,
      skills:
        initial && !form.skills.trim()
          ? undefined
          : form.skills
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean)
              .map((name) => ({ name, weight: 2 as const })),
    };
    try {
      const response = await fetch(
        initial ? `/api/jobs/${initial.id}` : "/api/jobs",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(text.error);
      const result = (await response.json()) as { job: { id: string } };
      toast.show(text.saved);
      if (!initial)
        router.push(pathname.replace(/\/new$/, `/${result.job.id}`));
      else router.refresh();
    } catch {
      toast.show(text.error, "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex max-w-[720px] flex-col gap-10" onSubmit={submit}>
      <FieldGroup legend={text.groups.basics}>
        <Field label={text.title} required>
          <Input value={form.title} onChange={set("title")} maxLength={140} />
        </Field>
        <Field label={text.description} required>
          <Textarea
            className="min-h-60"
            minLength={50}
            maxLength={20000}
            value={form.description}
            onChange={set("description")}
          />
        </Field>
      </FieldGroup>

      <FieldGroup legend={text.groups.details}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={text.category}>
            <Select value={form.category} onChange={set("category")}>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {options.categories[value] ?? value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={text.employmentType}>
            <Select
              value={form.employmentType}
              onChange={set("employmentType")}
            >
              {["full_time", "part_time", "contract"].map((value) => (
                <option key={value} value={value}>
                  {options.employment[value] ?? value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={text.workFormat}>
            <Select value={form.workFormat} onChange={set("workFormat")}>
              {["remote", "hybrid", "onsite"].map((value) => (
                <option key={value} value={value}>
                  {options.formats[value] ?? value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={text.location}>
          <Input value={form.location} onChange={set("location")} />
        </Field>
      </FieldGroup>

      <FieldGroup legend={text.groups.application}>
        <Field label={text.applicationMethod}>
          <Select
            value={form.applicationMethod}
            onChange={set("applicationMethod")}
          >
            {(["internal", "external_url", "email"] as const).map((value) => (
              <option key={value} value={value}>
                {text.methods[value]}
              </option>
            ))}
          </Select>
        </Field>
        {form.applicationMethod === "external_url" && (
          <Field label={text.applicationUrl} required>
            <Input
              type="url"
              value={form.applicationUrl}
              onChange={set("applicationUrl")}
            />
          </Field>
        )}
        {form.applicationMethod === "email" && (
          <Field label={text.applicationEmail} required>
            <Input
              type="email"
              value={form.applicationEmail}
              onChange={set("applicationEmail")}
            />
          </Field>
        )}
      </FieldGroup>

      <FieldGroup legend={text.groups.salary}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={text.salaryCurrency}>
            <Input
              className="t-data uppercase"
              maxLength={3}
              value={form.salaryCurrency}
              onChange={set("salaryCurrency")}
            />
          </Field>
          <Field label={text.salaryMin}>
            <Input numeric value={form.salaryMin} onChange={set("salaryMin")} />
          </Field>
          <Field label={text.salaryMax}>
            <Input numeric value={form.salaryMax} onChange={set("salaryMax")} />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup legend={text.groups.skills}>
        <Field label={text.skills}>
          <Input value={form.skills} onChange={set("skills")} />
        </Field>
      </FieldGroup>

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-bg/95 px-4 py-4">
        <Button
          type="submit"
          loading={saving}
          icon={<Icon icon={Save} size={16} />}
        >
          {text.save}
        </Button>
      </div>
    </form>
  );
}
