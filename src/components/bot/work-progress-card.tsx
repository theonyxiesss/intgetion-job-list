"use client";

import { Check, Circle, CircleAlert, Clock, LoaderCircle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import type { StepSummary } from "@/modules/bot/ui/step-summary";
import { stepForTool } from "./thinking-status";
import { workSeconds, type WorkState, type WorkStep } from "./work-progress";

/**
 * The turn's work as a timeline (TZ 36, task A): observed tool steps with
 * what each did and how long it took, never generated reasoning. Folded to
 * one line ("3 steps · 6 s"); the running step glints until it ends.
 */
export function WorkProgressCard({
  steps,
  state,
  fallback = false,
}: {
  steps: WorkStep[];
  state: WorkState;
  fallback?: boolean;
}) {
  const t = useTranslations("chat.work");
  const categories = useTranslations("categories");
  const format = useFormatter();
  const attention = steps.some((step) =>
    ["waiting", "blocked", "failed", "unknown"].includes(step.status),
  );
  const active = steps.find((step) => step.status === "running");
  const seconds = workSeconds(steps);
  const stateLabel = t(state === "done" && attention ? "attention" : state);

  function summaryText(summary: StepSummary): string {
    switch (summary.kind) {
      case "jobs": {
        const filters = [
          summary.category ? categories(summary.category as never) : null,
          summary.remote ? t("summary.remote") : null,
          summary.country ?? null,
        ].filter(Boolean);
        const found = t("summary.jobs", { count: summary.count });
        return [
          filters.length ? `${filters.join(" · ")} → ${found}` : found,
          summary.dropped ? t("summary.dropped") : null,
        ]
          .filter(Boolean)
          .join(". ");
      }
      case "services":
        return t("summary.services", { count: summary.count });
      case "events":
        return t("summary.events", { count: summary.count });
      case "compare":
        return t("summary.compare", { count: summary.count });
      case "calc":
        return t(`summary.calc.${summary.formula}` as never);
      case "price":
        return t("summary.price");
    }
  }

  return (
    <details
      className="rounded-lg border border-line bg-surface px-3"
      data-work-progress
    >
      <summary
        className="min-h-11 cursor-pointer py-3 text-sm text-fg-muted"
        aria-label={`${t("title")} · ${stateLabel}`}
      >
        <span role="status">
          {t("title")} · {stateLabel}
        </span>
        {steps.length > 0 ? (
          <span className="ml-2">
            {t("steps", { count: steps.length })}
            {seconds !== null && state !== "running" ? (
              <span className="t-data ml-1 tabular-nums">
                · {t("seconds", { seconds })}
              </span>
            ) : null}
          </span>
        ) : null}
        {state === "running" && active ? (
          <span className="spoki-shimmer mt-1 block">
            {t(`tools.${stepForTool(active.name)}`)}
          </span>
        ) : null}
      </summary>
      <div className="grid gap-3 pb-3">
        {steps.length === 0 ? (
          <p className="t-body-s text-fg-muted">
            {t(state === "running" ? "preparing" : "noSteps")}
          </p>
        ) : (
          <ol className="grid">
            {steps.map((step, index) => (
              <li key={step.id} className="flex gap-3 text-sm">
                {/* The rail: a status mark and a thin line to the next step. */}
                <span className="flex flex-col items-center">
                  <span
                    className={
                      step.status === "running"
                        ? "mt-0.5 text-accent motion-safe:animate-spin"
                        : step.status === "completed"
                          ? "mt-0.5 text-fg"
                          : "mt-0.5 text-fg-muted"
                    }
                  >
                    <Icon
                      size={16}
                      icon={
                        step.status === "completed"
                          ? Check
                          : step.status === "running"
                            ? LoaderCircle
                            : step.status === "waiting"
                              ? Clock
                              : step.status === "failed"
                                ? CircleAlert
                                : Circle
                      }
                    />
                  </span>
                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="my-1 w-px flex-1 bg-line"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 pb-3">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span
                      className={
                        step.status === "running" ? "spoki-shimmer" : undefined
                      }
                    >
                      {t(`tools.${stepForTool(step.name)}`)}
                    </span>
                    {step.ms !== undefined ? (
                      <span className="t-data text-fg-muted tabular-nums">
                        {t("seconds", {
                          seconds: format.number(
                            Math.max(0.1, step.ms / 1000),
                            {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            },
                          ),
                        })}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {step.summary
                      ? summaryText(step.summary)
                      : t(`step.${step.status}`)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
        {fallback ? (
          <p className="t-body-s text-fg-muted">{t("fallback")}</p>
        ) : null}
        {state === "stopped" ||
        steps.some((step) => step.status === "unknown") ? (
          <p className="t-body-s text-fg-muted">{t("interrupted")}</p>
        ) : null}
      </div>
    </details>
  );
}
