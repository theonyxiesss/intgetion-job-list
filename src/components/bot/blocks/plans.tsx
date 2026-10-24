"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { usdText } from "@/lib/calc";
import type { ComparePlansProps, UiAction } from "@/modules/bot/ui/types";
import { actionById, BlockButton, type BlockHandlers } from "./block-kit";

/**
 * Plans side by side (D523): prices from the price list, the person's own
 * plan marked, one button per plan to its payment or start page. One column
 * in a narrow panel, two or four as the block grows.
 */
export function ComparePlans({
  props,
  actions,
  handlers,
}: {
  props: ComparePlansProps;
  actions: readonly UiAction[];
  handlers: BlockHandlers;
}) {
  const t = useTranslations("chat.blocks.plans");
  const locale = useLocale();
  return (
    <ul className="grid gap-2 @lg:grid-cols-2 @4xl:grid-cols-4">
      {props.plans.map((plan) => {
        const own = plan.code === props.current;
        const action = actionById(actions, plan.action);
        return (
          <li
            key={plan.code}
            className={
              plan.recommended && !own
                ? "flex min-w-0 flex-col gap-3 rounded-lg border border-accent bg-surface-2 p-4"
                : "flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface-2 p-4"
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{plan.name}</p>
              {own ? <Badge tone="success">{t("current")}</Badge> : null}
              {plan.recommended && !own ? (
                <Badge tone="new">{t("recommended")}</Badge>
              ) : null}
            </div>
            <p>
              <span className="font-mono text-2xl">
                {/* $0, not "Free": a free plan is often named so already. */}
                {usdText(plan.priceCents ?? 0, locale)}
              </span>
              {plan.priceCents ? (
                <span className="t-body-s ml-1 text-fg-muted">
                  {plan.per === "job" ? t("perJob") : t("perMonth")}
                </span>
              ) : null}
            </p>
            {plan.yearlyCents ? (
              <p className="t-body-s font-mono text-fg-muted">
                {t("perYear", { price: usdText(plan.yearlyCents, locale) })}
              </p>
            ) : null}
            {plan.points.length ? (
              <ul className="grid gap-1.5">
                {plan.points.map((point) => (
                  <li key={point} className="t-body-s flex gap-2 text-fg-muted">
                    <Icon icon={Check} size={16} className="mt-0.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {action ? (
              <BlockButton
                action={action}
                handlers={handlers}
                variant={plan.recommended ? "primary" : "secondary"}
                className="mt-auto w-full"
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
