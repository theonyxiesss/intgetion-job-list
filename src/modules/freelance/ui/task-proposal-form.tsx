"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { callApi, errorText, type ClientCopy } from "./client-api";

/** Send one proposal with a price, delivery time and cover note. */
export function TaskProposalForm({
  taskId,
  copy,
}: {
  taskId: string;
  copy: ClientCopy;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const result = await callApi<{ proposal: { id: string } }>(
      "/api/freelance/proposals",
      {
        taskId,
        price: String(data.get("price")),
        deliveryDays: Number(data.get("deliveryDays")),
        cover: data.get("cover"),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(errorText(copy, result.code));
      return;
    }
    setSent(true);
  }

  if (sent) return <p role="status" className="border border-line p-4">{copy.proposalSent}</p>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 border-t border-line pt-6">
      <FieldGroup legend={copy.sendProposal}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.proposalPrice} help={copy.proposalPriceHint}>
            <Input name="price" inputMode="decimal" min="10" max="20000" required />
          </Field>
          <Field label={copy.deliveryDaysLabel} help={copy.deliveryDaysHint}>
            <Input name="deliveryDays" type="number" min={1} max={90} required />
          </Field>
        </div>
        <Field label={copy.cover} help={copy.coverHint}>
          <Textarea name="cover" minLength={40} maxLength={2000} rows={6} required />
        </Field>
      </FieldGroup>
      {error ? <p role="alert" className="border border-danger p-3">{error}</p> : null}
      <Button type="submit" disabled={busy}>{busy ? copy.sending : copy.sendProposal}</Button>
    </form>
  );
}
