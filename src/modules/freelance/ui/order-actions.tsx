"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import type { FreelanceOrderStatus } from "@/config/freelance";
import { callApi, errorText, type ClientCopy } from "./client-api";

const DANGER: ReadonlySet<FreelanceOrderStatus> = new Set([
  "declined",
  "cancelled",
]);

/** Buttons for one side of an order; the server checks every edge (28.4). */
export function OrderActions({
  orderId,
  status,
  next,
  copy,
}: {
  orderId: string;
  status: FreelanceOrderStatus;
  next: FreelanceOrderStatus[];
  copy: ClientCopy;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  async function move(to: FreelanceOrderStatus) {
    setBusy(to);
    setError(null);
    const result = await callApi(
      `/api/freelance/orders/${orderId}/transition`,
      {
        to,
        ...(to === "delivered" ? { deliveryUrl: url } : {}),
      },
    );
    setBusy(null);
    if (!result.ok) {
      setError(errorText(copy, result.code));
      return;
    }
    router.refresh();
  }

  const label = (to: FreelanceOrderStatus) =>
    to === "in_progress"
      ? status === "delivered"
        ? copy.toRevise
        : copy.toStart
      : copy[`to_${to}`];

  if (next.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {next.includes("delivered") ? (
        <Field label={copy.deliveryUrl ?? ""} help={copy.deliveryHint}>
          <Input
            value={url}
            type="url"
            inputMode="url"
            placeholder={copy.deliveryPlaceholder ?? ""}
            onChange={(event) => setUrl(event.target.value)}
          />
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {next.map((to) => (
          <Button
            key={to}
            variant={
              DANGER.has(to)
                ? "danger"
                : to === next[0]
                  ? "primary"
                  : "secondary"
            }
            loading={busy === to}
            disabled={busy !== null && busy !== to}
            onClick={() => move(to)}
          >
            {label(to)}
          </Button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="t-body-s text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One review of a completed order: the buyer's public review of the service
 * (28.5), or with `about="client"` the seller's rating of the client (D568).
 */
export function ReviewForm({
  orderId,
  copy,
  about = "service",
}: {
  orderId: string;
  copy: ClientCopy;
  about?: "service" | "client";
}) {
  const router = useRouter();
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const url =
      about === "client"
        ? "/api/freelance/client-reviews"
        : "/api/freelance/reviews";
    const result = await callApi(url, {
      orderId,
      rating: Number(rating),
      body,
    });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(copy, result.code));
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h2 className="t-h3">
        {about === "client" ? copy.clientReviewTitle : copy.reviewTitle}
      </h2>
      {about === "client" ? (
        <p className="t-body-s text-fg-muted">{copy.clientReviewNote}</p>
      ) : null}
      <Field label={copy.rating ?? ""}>
        <Select
          value={rating}
          onChange={(event) => setRating(event.target.value)}
        >
          {["5", "4", "3", "2", "1"].map((value) => (
            <option key={value} value={value}>
              {`${value}/5`}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.reviewText ?? ""} help={copy.reviewHint}>
        <Textarea
          value={body}
          rows={3}
          maxLength={1000}
          onChange={(event) => setBody(event.target.value)}
        />
      </Field>
      {error ? (
        <p role="alert" className="t-body-s text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={busy}>
        {copy.reviewSend}
      </Button>
    </form>
  );
}
