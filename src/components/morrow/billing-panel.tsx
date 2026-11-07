"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { handSpokiAsk } from "@/components/bot/spoki-ask";
import { CryptoPay } from "@/modules/billing/ui/crypto-pay";
import { InterestForm } from "@/modules/billing/ui/interest-form";
import type { NonEvmOption } from "@/modules/billing/ui/non-evm-pay";

export const PAY_PLANS = ["plus", "pro", "team", "hire"] as const;
export type PayPlan = (typeof PAY_PLANS)[number];

type Checkout = {
  ready: boolean;
  evm: boolean;
  networks: NonEvmOption[];
  projectId: string;
  amounts: Record<PayPlan, string>;
  jobs: { id: string; title: string }[];
  companies: { id: string; name: string }[];
};

/**
 * Plans and payment on the chat home (TZ 53): the plans as cards, then the
 * same crypto checkout as `/billing/crypto`, whose wallet window opens over
 * the chat and whose result shows in place.
 */
export function BillingPanel({ initialPlan }: { initialPlan: PayPlan | null }) {
  const t = useTranslations("morrow.panels.billing");
  const billing = useTranslations("billing");
  const tiers = useTranslations("pricing.tiers");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [failed, setFailed] = useState(false);
  const [plan, setPlan] = useState<PayPlan | null>(initialPlan);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/billing/checkout", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(String(response.status));
        setCheckout((await response.json()) as Checkout);
      } catch {
        setFailed(true);
      }
    };
    const first = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(first);
  }, []);

  if (!checkout) {
    return (
      <p className="morrow-room-status" role={failed ? "alert" : "status"}>
        {failed ? t("failed") : t("loading")}
      </p>
    );
  }
  if (!checkout.ready) return <InterestForm />;

  const rails = { evm: checkout.evm, networks: checkout.networks };
  const price = (code: PayPlan) =>
    code === "hire"
      ? t("perJob", { amount: checkout.amounts[code] })
      : t("perMonth", { amount: checkout.amounts[code] });

  if (!plan) {
    return (
      <div className="morrow-plans">
        {PAY_PLANS.map((code) => (
          <button
            key={code}
            type="button"
            className="morrow-plan"
            onClick={() => {
              setTarget(null);
              setPlan(code);
            }}
          >
            <b>{tiers(`${code}.name`)}</b>
            <span>{tiers(`${code}.for`)}</span>
            <strong>{price(code)}</strong>
          </button>
        ))}
      </div>
    );
  }

  const choices =
    plan === "team"
      ? checkout.companies
      : plan === "hire"
        ? checkout.jobs.map((job) => ({ id: job.id, name: job.title }))
        : [];
  const chosen =
    plan === "plus" || plan === "pro"
      ? "self"
      : (target ?? (choices.length === 1 ? choices[0]!.id : null));

  return (
    <div className="morrow-panel-block">
      <button
        type="button"
        className="morrow-panel-back"
        onClick={() => setPlan(null)}
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t("back")}
      </button>
      <h2>
        {tiers(`${plan}.name`)} · {price(plan)}
      </h2>
      {chosen ? (
        <CryptoPay
          plan={plan}
          amount={checkout.amounts[plan]}
          projectId={checkout.projectId}
          jobId={plan === "hire" ? chosen : undefined}
          companyId={plan === "team" ? chosen : undefined}
          {...rails}
        />
      ) : choices.length > 0 ? (
        <>
          <p>{plan === "team" ? billing("pickCompany") : billing("pickJob")}</p>
          <div className="morrow-plans">
            {choices.map((item) => (
              <button
                key={item.id}
                type="button"
                className="morrow-plan"
                onClick={() => setTarget(item.id)}
              >
                <b>{item.name}</b>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p>{plan === "team" ? billing("noCompany") : t("noJob")}</p>
          <button
            type="button"
            className="morrow-panel-button"
            onClick={() =>
              handSpokiAsk(plan === "team" ? t("askCompany") : t("askJob"))
            }
          >
            {plan === "team" ? t("createCompany") : t("postJob")}
          </button>
        </>
      )}
    </div>
  );
}
