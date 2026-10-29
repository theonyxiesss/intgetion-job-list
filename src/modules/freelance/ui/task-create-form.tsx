"use client";

import { useState, type FormEvent } from "react";
import { FREELANCE_CATEGORIES } from "@/config/freelance";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { callApi, errorText, type ClientCopy } from "./client-api";

/** Create a freelance task; the moderator must publish it before it is listed. */
export function TaskCreateForm({ copy }: { copy: ClientCopy }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const budgetMin = String(data.get("budgetMin") ?? "").trim();
    const budgetMax = String(data.get("budgetMax") ?? "").trim();
    const result = await callApi<{ task: { id: string; status: string } }>(
      "/api/freelance/tasks",
      {
        title: data.get("title"),
        description: data.get("description"),
        category: data.get("category"),
        ...(budgetMin ? { budgetMin } : {}),
        ...(budgetMax ? { budgetMax } : {}),
        wantedBy: data.get("wantedBy"),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(errorText(copy, result.code));
      return;
    }
    setSent(true);
    router.refresh();
  }

  if (sent) {
    return <p role="status" className="border border-line p-4">{copy.submittedForReview}</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <FieldGroup legend={copy.taskDetails}>
        <Field label={copy.taskTitle} help={copy.taskTitleHint}>
          <Input name="title" minLength={10} maxLength={120} required />
        </Field>
        <Field label={copy.category}>
          <Select name="category" required defaultValue="">
            <option value="" disabled>{copy.chooseCategory}</option>
            {FREELANCE_CATEGORIES.map((category) => (
              <option key={category} value={category}>{copy[`category_${category}`]}</option>
            ))}
          </Select>
        </Field>
        <Field label={copy.description} help={copy.taskDescriptionHint}>
          <Textarea name="description" minLength={80} maxLength={2000} rows={8} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.budgetMin}>
            <Input name="budgetMin" inputMode="decimal" placeholder={copy.optional} />
          </Field>
          <Field label={copy.budgetMax}>
            <Input name="budgetMax" inputMode="decimal" placeholder={copy.optional} />
          </Field>
        </div>
        <Field label={copy.wantedBy} help={copy.wantedByHint}>
          <Input name="wantedBy" maxLength={80} />
        </Field>
      </FieldGroup>
      {error ? <p role="alert" className="border border-danger p-3">{error}</p> : null}
      <Button type="submit" disabled={busy}>{busy ? copy.sending : copy.postTask}</Button>
    </form>
  );
}
