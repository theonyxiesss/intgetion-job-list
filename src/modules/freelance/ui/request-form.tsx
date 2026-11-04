"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { callApi, errorText, type ClientCopy } from "./client-api";

export type RequestTier = {
  tier: string;
  label: string;
  price: string;
  days: string;
  revisions: string;
  includes: string[];
};

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
        <fieldset className="flex flex-col gap-2">
          <legend className="t-label text-fg-muted">{copy.package}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {tiers.map((item) => (
              <label key={item.tier} className="cursor-pointer">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="freelance-package"
                  aria-label={item.label}
                  value={item.tier}
                  checked={tier === item.tier}
                  onChange={() => setTier(item.tier)}
                />
                <span className="flex h-full flex-col gap-2 rounded-lg border border-line bg-surface p-3 transition-colors peer-checked:border-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                  <span className="flex items-start justify-between gap-2">
                    <span className="t-label">{item.label}</span>
                    <span className="t-data">{item.price}</span>
                  </span>
                  <span className="t-body-s text-fg-muted">
                    {item.days} · {item.revisions}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {tiers.length === 1 && tiers[0] ? (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="t-label">{tiers[0].label}</span>
            <span className="t-data-l">{tiers[0].price}</span>
          </p>
          <p className="t-body-s text-fg-muted">
            {tiers[0].days} · {tiers[0].revisions}
          </p>
        </div>
      ) : null}
      {tiers.find((item) => item.tier === tier)?.includes.length ? (
        <div className="flex flex-col gap-2">
          <p className="t-label text-fg-muted">{copy.packageIncludes}</p>
          <ul className="flex flex-col gap-1">
            {tiers
              .find((item) => item.tier === tier)
              ?.includes.map((item) => (
                <li key={item} className="t-body-s flex gap-2">
                  <span aria-hidden="true" className="text-success">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
          </ul>
        </div>
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
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="t-label text-fg-muted">{copy.beforeYouSend}</p>
        <p className="t-body-s text-fg-muted">{copy.requestNote}</p>
        <p className="t-body-s text-fg-muted">{copy.requestNextStep}</p>
      </div>
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
