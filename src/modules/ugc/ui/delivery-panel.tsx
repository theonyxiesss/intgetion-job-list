"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { UGC_DELIVERY_PROBLEMS, UGC_LIMITS } from "@/config/ugc";
import { UgcAction } from "./action";

type Shipment = {
  carrier: string;
  tracking: string;
  expectedDate: string | null;
  state: "shipped" | "received" | "problem";
  problem: string | null;
};

/** Delivery of a physical product: the company sends, the creator confirms (U6). */
export function DeliveryPanel({
  inviteId,
  shipment,
  canShip,
  canConfirmReceipt,
  canReportProblem,
}: {
  inviteId: string;
  shipment: Shipment | null;
  canShip: boolean;
  canConfirmReceipt: boolean;
  canReportProblem: boolean;
}) {
  const t = useTranslations("ugc");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState<string>(UGC_DELIVERY_PROBLEMS[0]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setError(t("error"));
      return;
    }
    window.location.reload();
  }

  function onShip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void post({
      action: "ship",
      inviteId,
      carrier: String(form.get("carrier") ?? ""),
      tracking: String(form.get("tracking") ?? ""),
      expectedDate: String(form.get("expectedDate") ?? ""),
    });
  }

  return (
    <section
      aria-labelledby="delivery-title"
      className="flex flex-col gap-3 rounded-lg border border-line p-4"
    >
      <h2 id="delivery-title" className="t-h4">
        {t("deliveryTitle")}
      </h2>
      {shipment ? (
        <div className="t-body-s flex flex-col gap-1">
          <p className="font-mono break-all">
            {t("deliverySent", {
              carrier: shipment.carrier,
              tracking: shipment.tracking,
            })}
          </p>
          {shipment.expectedDate ? (
            <p className="font-mono">
              {t("deliveryExpected", { date: shipment.expectedDate })}
            </p>
          ) : null}
          <p role="status" className="font-medium">
            {shipment.state === "received"
              ? t("deliveryReceived")
              : shipment.state === "problem" && shipment.problem
                ? t("deliveryProblemLine", {
                    reason: t(`deliveryReason.${shipment.problem}`),
                  })
                : t("deliveryOnTheWay")}
          </p>
        </div>
      ) : (
        <p className="t-body-s text-fg-muted">{t("deliveryNone")}</p>
      )}
      {canShip ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={onShip}
          aria-busy={busy}
        >
          <Field label={t("shipCarrier")}>
            <Input name="carrier" required maxLength={UGC_LIMITS.carrierMax} />
          </Field>
          <Field label={t("shipTracking")}>
            <Input
              name="tracking"
              required
              maxLength={UGC_LIMITS.trackingMax}
            />
          </Field>
          <Field label={t("shipExpected")}>
            <Input name="expectedDate" type="date" />
          </Field>
          <Button
            type="submit"
            variant="strong"
            disabled={busy}
            className="self-start"
          >
            {t("shipSend")}
          </Button>
        </form>
      ) : null}
      {canConfirmReceipt || canReportProblem ? (
        <div className="flex flex-wrap items-center gap-3">
          {canConfirmReceipt ? (
            <UgcAction
              action="received"
              label={t("deliveryConfirm")}
              body={{ inviteId }}
              primary
            />
          ) : null}
          {canReportProblem ? (
            <>
              <label className="t-body-s">
                <span className="sr-only">{t("deliveryReasonLabel")}</span>
                <select
                  className="rounded-md border border-line bg-bg px-2 py-2"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                >
                  {UGC_DELIVERY_PROBLEMS.map((code) => (
                    <option key={code} value={code}>
                      {t(`deliveryReason.${code}`)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void post({ action: "deliveryProblem", inviteId, reason })
                }
              >
                {t("deliveryReportProblem")}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="t-body-s text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
