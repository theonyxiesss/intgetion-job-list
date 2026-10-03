"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
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
};

export function JobForm({
  companyId,
  initial,
  text,
}: {
  companyId: string;
  initial?: JobDto;
  text: Text;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState("");
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
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
      setMessage(text.saved);
      if (!initial)
        router.push(pathname.replace(/\/new$/, `/${result.job.id}`));
    } catch {
      setMessage(text.error);
    } finally {
      setSaving(false);
    }
  }

  function field(name: keyof typeof form, label: string, type = "text") {
    return (
      <label className="flex flex-col gap-1 text-sm" key={name}>
        {label}
        <input
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
          type={type}
          value={form[name]}
          onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        />
      </label>
    );
  }

  return (
    <form className="flex max-w-2xl flex-col gap-4" onSubmit={submit}>
      {field("title", text.title)}
      <label className="flex flex-col gap-1 text-sm">
        {text.description}
        <textarea
          className="min-h-40 rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
          minLength={50}
          maxLength={20000}
          required
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {text.category}
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
          value={form.category}
          onChange={(event) =>
            setForm({ ...form, category: event.target.value })
          }
        >
          {[
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
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {text.employmentType}
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
          value={form.employmentType}
          onChange={(event) =>
            setForm({
              ...form,
              employmentType: event.target.value as typeof form.employmentType,
            })
          }
        >
          {["full_time", "part_time", "contract"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {text.workFormat}
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
          value={form.workFormat}
          onChange={(event) =>
            setForm({
              ...form,
              workFormat: event.target.value as typeof form.workFormat,
            })
          }
        >
          {["remote", "hybrid", "onsite"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {field("location", text.location)}
      <label className="flex flex-col gap-1 text-sm">
        {text.applicationMethod}
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
          value={form.applicationMethod}
          onChange={(event) =>
            setForm({
              ...form,
              applicationMethod: event.target
                .value as typeof form.applicationMethod,
            })
          }
        >
          {["internal", "external_url", "email"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {form.applicationMethod === "external_url"
        ? field("applicationUrl", text.applicationUrl, "url")
        : null}
      {form.applicationMethod === "email"
        ? field("applicationEmail", text.applicationEmail, "email")
        : null}
      {field("salaryCurrency", text.salaryCurrency)}
      {field("salaryMin", text.salaryMin, "number")}
      {field("salaryMax", text.salaryMax, "number")}
      {field("skills", text.skills)}
      <button
        className="w-fit rounded-md bg-blue-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        disabled={saving}
        type="submit"
      >
        {saving ? text.saving : text.save}
      </button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
