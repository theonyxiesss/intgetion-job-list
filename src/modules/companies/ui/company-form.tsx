"use client";

import { useState, type FormEvent } from "react";

type CompanyFormProps = {
  action: "create" | "edit";
  companyId?: string;
  initial?: {
    name: string;
    domain: string | null;
    websiteUrl: string | null;
    description: string | null;
  };
  text: {
    name: string;
    domain: string;
    website: string;
    description: string;
    logo: string;
    save: string;
    error: string;
    saved: string;
  };
};

export function CompanyForm({
  action,
  companyId,
  initial,
  text,
}: CompanyFormProps) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState(companyId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const isCreate = action === "create" && !existingId;
    const response = await fetch(
      isCreate ? "/api/companies" : `/api/companies/${existingId}`,
      {
        method: isCreate ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          domain: form.get("domain") || null,
          websiteUrl: form.get("websiteUrl") || null,
          description: form.get("description") || null,
        }),
      },
    );
    if (!response.ok) {
      setError(text.error);
      return;
    }
    const result = (await response.json()) as { company: { id: string } };
    const id = existingId ?? result.company.id;
    setExistingId(id);
    const logo = form.get("logo");
    if (logo instanceof File && logo.size > 0) {
      const logoForm = new FormData();
      logoForm.set("file", logo);
      const uploaded = await fetch(`/api/companies/${id}/logo`, {
        method: "POST",
        body: logoForm,
      });
      if (!uploaded.ok) {
        setError(text.error);
        return;
      }
    }
    if (isCreate) window.location.assign(window.location.pathname);
    setSaved(true);
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={submit}>
      <label className="flex flex-col gap-1">
        {text.name}
        <input
          required
          minLength={2}
          maxLength={160}
          name="name"
          defaultValue={initial?.name}
          className="min-h-11 rounded-md border border-current/30 bg-transparent px-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        {text.domain}
        <input
          name="domain"
          defaultValue={initial?.domain ?? ""}
          className="min-h-11 rounded-md border border-current/30 bg-transparent px-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        {text.website}
        <input
          type="url"
          name="websiteUrl"
          defaultValue={initial?.websiteUrl ?? ""}
          className="min-h-11 rounded-md border border-current/30 bg-transparent px-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        {text.description}
        <textarea
          name="description"
          maxLength={5000}
          defaultValue={initial?.description ?? ""}
          className="min-h-28 rounded-md border border-current/30 bg-transparent p-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        {text.logo}
        <input
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="min-h-11 rounded-md border border-current/30 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 w-fit rounded-md bg-foreground px-4 text-background"
      >
        {text.save}
      </button>
      {error ? <p role="alert">{text.error}</p> : null}
      {saved ? <p role="status">{text.saved}</p> : null}
    </form>
  );
}
