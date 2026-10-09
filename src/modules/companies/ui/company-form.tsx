"use client";

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type CompanyFormProps = {
  action: "create" | "edit";
  companyId?: string;
  initial?: {
    name: string;
    domain: string | null;
    websiteUrl: string | null;
    linkedinUrl: string | null;
    telegramUrl: string | null;
    xUrl: string | null;
    description: string | null;
    timezone: string | null;
  };
  text: {
    name: string;
    domain: string;
    website: string;
    linkedin: string;
    telegram: string;
    x: string;
    description: string;
    timezone: string;
    timezoneHint: string;
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
            linkedinUrl: form.get("linkedinUrl") || null,
            telegramUrl: form.get("telegramUrl") || null,
            xUrl: form.get("xUrl") || null,
            description: form.get("description") || null,
            timezone: String(form.get("timezone") ?? "").trim() || null,
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
      <div className="grid gap-6 md:grid-cols-3">
        <Field label={text.linkedin}>
          <Input
            type="url"
            name="linkedinUrl"
            defaultValue={initial?.linkedinUrl ?? ""}
          />
        </Field>
        <Field label={text.telegram}>
          <Input
            type="url"
            name="telegramUrl"
            defaultValue={initial?.telegramUrl ?? ""}
          />
        </Field>
        <Field label={text.x}>
          <Input type="url" name="xUrl" defaultValue={initial?.xUrl ?? ""} />
        </Field>
      </div>
      <Field label={text.description}>
        <Textarea
          name="description"
          maxLength={5000}
          defaultValue={initial?.description ?? ""}
        />
      </Field>
      <Field label={text.timezone} help={text.timezoneHint}>
        <Input
          name="timezone"
          className="t-data"
          maxLength={80}
          defaultValue={initial?.timezone ?? ""}
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
