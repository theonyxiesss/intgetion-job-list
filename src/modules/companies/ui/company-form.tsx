"use client";

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  Button,
  Field,
  Icon,
  Input,
  Textarea,
  useToast,
} from "@/components/ui";

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
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(companyId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
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
        toast.show(text.error, "danger");
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
          toast.show(text.error, "danger");
          return;
        }
      }
      if (isCreate) window.location.assign(window.location.pathname);
      toast.show(text.saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex max-w-[720px] flex-col gap-6" onSubmit={submit}>
      <Field label={text.name} required>
        <Input
          minLength={2}
          maxLength={160}
          name="name"
          defaultValue={initial?.name}
        />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label={text.domain}>
          <Input
            name="domain"
            className="t-data"
            defaultValue={initial?.domain ?? ""}
          />
        </Field>
        <Field label={text.website}>
          <Input
            type="url"
            name="websiteUrl"
            defaultValue={initial?.websiteUrl ?? ""}
          />
        </Field>
      </div>
      <Field label={text.description}>
        <Textarea
          name="description"
          maxLength={5000}
          defaultValue={initial?.description ?? ""}
        />
      </Field>
      <Field label={text.logo}>
        <Input
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="py-2 file:mr-4 file:border-0 file:bg-transparent file:font-display file:text-[14px] file:tracking-[0.14em] file:text-fg file:uppercase"
        />
      </Field>
      <Button
        type="submit"
        loading={saving}
        icon={<Icon icon={Save} size={16} />}
        className="self-start"
      >
        {text.save}
      </Button>
    </form>
  );
}
