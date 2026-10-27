"use client";

import { Check, Circle, CircleAlert, Clock, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { stepForTool } from "./thinking-status";
import type { WorkState, WorkStep } from "./work-progress";

/** A compact account of observed tool activity, never generated reasoning. */
export function WorkProgressCard({
  steps,
  state,
}: {
  steps: WorkStep[];
  state: WorkState;
}) {
  const t = useTranslations("chat.work");
  const attention = steps.some((step) =>
    ["waiting", "blocked", "failed", "unknown"].includes(step.status),
  );
  const active = steps.find((step) => step.status === "running");
  return (
    <details
      className="rounded-lg border border-line bg-surface px-3"
      data-work-progress
    >
      <summary
        className="min-h-11 cursor-pointer py-3 text-sm text-fg-muted"
        aria-label={`${t("title")} · ${t(state === "done" && attention ? "attention" : state)}`}
      >
        <span role="status">
          {t("title")} ·{" "}
          {t(state === "done" && attention ? "attention" : state)}
        </span>
        {steps.length > 0 ? (
          <span className="ml-2 font-mono">{steps.length}</span>
        ) : null}
        {state === "running" && active ? (
          <span className="mt-1 block">
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
          <ol className="grid gap-3">
            {steps.map((step) => (
              <li key={step.id} className="flex items-start gap-2 text-sm">
                <span
                  className={
                    step.status === "running"
                      ? "mt-0.5 motion-safe:animate-spin"
                      : "mt-0.5"
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
                <span className="min-w-0">
                  {t(`tools.${stepForTool(step.name)}`)}
                  <span className="block text-xs text-fg-muted">
                    {t(`step.${step.status}`)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
        {state === "stopped" ||
        steps.some((step) => step.status === "unknown") ? (
          <p className="t-body-s text-fg-muted">{t("interrupted")}</p>
        ) : null}
      </div>
    </details>
  );
}
