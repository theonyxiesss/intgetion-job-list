"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { callApi, errorText, type ClientCopy } from "./client-api";

export type RequestTier = { tier: string; label: string };

/** A request to the freelancer; it becomes the order (28.4). */
export function RequestForm({
  serviceId,
  tiers,
  companies,
  copy,
}: {
  serviceId: string;
  tiers: RequestTier[];
  companies: { id: string; name: string }[];
  copy: ClientCopy;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(tiers[0]?.tier ?? "basic");
  const [task, setTask] = useState("");
  const [wantedBy, setWantedBy] = useState("");
  const [from, setFrom] = useState(companies[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskBad, setTaskBad] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setTaskBad(false);
    if (task.trim().length < 20) {
      setTaskBad(true);
      return;
    }
    setBusy(true);
    const result = await callApi<{ order: { id: string } }>(
      "/api/freelance/requests",
      {
        serviceId,
        tier,
        task,
        wantedBy: wantedBy || undefined,
        companyId: from || undefined,
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(errorText(copy, result.code));
      return;
    }
    router.push(`/freelance/orders/${result.data.order.id}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h2 className="t-h3">{copy.requestTitle}</h2>
      {tiers.length > 1 ? (
        <Field label={copy.package ?? ""}>
          <Select
            value={tier}
            onChange={(event) => setTier(event.target.value)}
          >
            {tiers.map((item) => (
              <option key={item.tier} value={item.tier}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field
        label={copy.task ?? ""}
        help={copy.taskHint}
        error={taskBad ? copy.taskShort : null}
        required
      >
        <Textarea
          value={task}
          rows={5}
          maxLength={2000}
          required
          onChange={(event) => setTask(event.target.value)}
        />
      </Field>
      <Field label={copy.wantedBy ?? ""} help={copy.wantedByHint}>
        <Input
          value={wantedBy}
          maxLength={80}
          onChange={(event) => setWantedBy(event.target.value)}
        />
      </Field>
      {companies.length > 0 ? (
        <Field label={copy.from ?? ""}>
          <Select
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
            <option value="">{copy.fromMe}</option>
          </Select>
        </Field>
      ) : null}
      <p className="t-body-s text-fg-muted">{copy.requestNote}</p>
      {error ? (
        <p role="alert" className="t-body-s text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={busy}>
        {copy.send}
      </Button>
    </form>
  );
}
