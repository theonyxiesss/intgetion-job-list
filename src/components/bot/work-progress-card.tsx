"use client";

import {
  Check,
  ChevronDown,
  Circle,
  CircleAlert,
  Clock,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
  const running = state === "running";
  // Open while Spoki works and folded once it is done, unless the person
  // opened or closed it themselves (D588).
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? running;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const timer = window.setInterval(
      () => setElapsed(performance.now() - start),
      100,
    );
    return () => window.clearInterval(timer);
  }, [running]);
  const tenths = (ms: number) =>
    format.number(Math.max(0.1, ms / 1000), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  // The live clock of this turn; an answer from the history has the steps' sum.
  const total = elapsed > 0 ? tenths(elapsed) : seconds;
  const stateLabel = t(state === "done" && attention ? "attention" : state);
  const thought = state === "done" && !attention && total !== null;
  const headline = thought
    ? t("thought", { seconds: total })
    : `${t("title")} · ${stateLabel}`;
  const stateIcon =
    state === "running"
      ? Sparkles
      : state === "failed" || attention
        ? CircleAlert
        : state === "stopped"
          ? Circle
          : Check;

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
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        if (next !== open) setChosen(next);
      }}
      className={`rounded-lg border border-line bg-surface px-3 transition-colors duration-200 ${running ? "spoki-beam" : ""}`}
      data-work-progress
    >
      <summary
        className="group relative flex min-h-12 cursor-pointer list-none items-center gap-3 py-2.5 text-left text-sm text-fg-muted marker:content-none"
        aria-label={`${t("title")} · ${stateLabel}`}
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 ${state === "failed" || attention ? "text-fg-muted" : "text-signal"}`}
          aria-hidden="true"
        >
          <Icon icon={stateIcon} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span role="status" className="block font-medium text-fg">
            {running ? (
              <span className="spoki-shimmer">{t("thinking")}</span>
            ) : thought ? (
              <span className="spoki-done">{headline}</span>
            ) : (
              headline
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
            {steps.length > 0 ? t("steps", { count: steps.length }) : null}
            {running ? (
              <span className="t-data tabular-nums">
                {t("seconds", { seconds: tenths(elapsed) })}
              </span>
            ) : total !== null && !thought ? (
              <span className="t-data tabular-nums">
                {t("seconds", { seconds: total })}
              </span>
            ) : null}
            {running && active ? (
              <span className="spoki-shimmer">
                {t(`tools.${stepForTool(active.name)}`)}
              </span>
            ) : null}
          </span>
        </span>
        <Icon
          icon={ChevronDown}
          size={16}
          className="shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-3 pb-3">
        {steps.length === 0 ? (
          <p className="t-body-s text-fg-muted">
            {t(state === "running" ? "preparing" : "noSteps")}
          </p>
        ) : (
          <ol className="spoki-feather grid max-h-56 overflow-y-auto py-2">
            {steps.map((step, index) => (
              <li key={step.id} className="spoki-step-in flex gap-3 text-sm">
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
