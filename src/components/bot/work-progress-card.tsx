"use client";

import {
  Check,
  ChevronDown,
  Circle,
  CircleAlert,
  Clock,
  LoaderCircle,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { StepSummary } from "@/modules/bot/ui/step-summary";
import { stepForTool, type ToolStep } from "./thinking-status";
import { workSeconds, type WorkState, type WorkStep } from "./work-progress";

/** Steps whose results are cards; placeholders glow while they run (D593). */
const CARD_STEPS: ReadonlySet<ToolStep> = new Set([
  "searchJobs",
  "services",
  "events",
]);

const stepIcon = (status: WorkStep["status"]) =>
  status === "completed"
    ? Check
    : status === "running"
      ? LoaderCircle
      : status === "waiting"
        ? Clock
        : status === "failed"
          ? CircleAlert
          : Circle;

/**
 * A count that runs up once, unless motion is reduced. A timer, not
 * animation frames: a background tab pauses frames and would leave the
 * count half way. It starts at 1 so a search never reads "nothing found".
 */
function useCountUp(target: number): number {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (
      target <= 1 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const start = Date.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - start) / 600);
      setValue(Math.max(1, Math.round(target * (1 - (1 - progress) ** 3))));
      if (progress >= 1) window.clearInterval(timer);
    }, 30);
    return () => window.clearInterval(timer);
  }, [target]);
  return value;
}

/**
 * The turn's work (TZ 36 task A, D593): observed tool steps, never generated
 * reasoning. While Spoki works it is one living line — a breathing mark, the
 * current step and a clock — with each finished step's real result below.
 * Once done it folds into a pill ("Thought for 6 s · 3 steps").
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
  const open = running || (chosen ?? false);
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
  const activeStep = active ? stepForTool(active.name) : null;
  // What Spoki does now, in plain words: read the request, run a tool, write.
  const phase = activeStep
    ? t(`live.${activeStep}`)
    : steps.length === 0
      ? t("live.understanding")
      : t("live.writing");

  function filters(summary: Extract<StepSummary, { kind: "jobs" }>) {
    return [
      summary.category ? categories(summary.category as never) : null,
      summary.remote ? t("summary.remote") : null,
      summary.country ?? null,
    ].filter((value): value is string => Boolean(value));
  }

  function summaryText(summary: StepSummary): string {
    switch (summary.kind) {
      case "jobs": {
        const found = t("summary.jobs", { count: summary.count });
        const chosenFilters = filters(summary);
        return [
          chosenFilters.length
            ? `${chosenFilters.join(" · ")} → ${found}`
            : found,
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

  if (running) {
    return (
      <details
        open
        className="w-full"
        data-work-progress
        data-thinking
        aria-busy="true"
      >
        <summary
          className="flex min-h-11 list-none items-center gap-3 marker:content-none"
          // The live line stays open until the turn ends.
          onClick={(event) => event.preventDefault()}
        >
          <span className="spoki-orb" aria-hidden="true" />
          <span role="status" className="min-w-0 flex-1 text-sm">
            <span key={phase} className="spoki-rise inline-block">
              <span className="spoki-shimmer">{phase}</span>
            </span>
          </span>
          <span className="t-data text-xs text-fg-subtle tabular-nums">
            {t("seconds", { seconds: tenths(elapsed) })}
          </span>
        </summary>
        {steps.some((step) => step.status !== "running") ? (
          <ol className="ml-10 grid gap-1 pt-1">
            {steps
              .filter((step) => step.status !== "running")
              .map((step) => (
                <LiveStep
                  key={step.id}
                  step={step}
                  label={
                    step.status === "running"
                      ? t(`live.${stepForTool(step.name)}`)
                      : t(`tools.${stepForTool(step.name)}`)
                  }
                  chips={
                    step.summary?.kind === "jobs" ? filters(step.summary) : []
                  }
                  result={(count) =>
                    step.summary
                      ? summaryText(
                          step.summary.kind === "jobs"
                            ? { ...step.summary, dropped: false }
                            : "count" in step.summary
                              ? { ...step.summary, count }
                              : step.summary,
                        )
                      : t(`step.${step.status}`)
                  }
                  found={(count) => t("summary.jobs", { count })}
                />
              ))}
          </ol>
        ) : null}
        {activeStep && CARD_STEPS.has(activeStep) ? (
          <div className="ml-10 grid gap-2 pt-2" aria-hidden="true">
            <div className="spoki-skeleton" />
            <div className="spoki-skeleton" />
            <div className="spoki-skeleton" />
          </div>
        ) : null}
        {fallback ? (
          <p className="t-body-s ml-10 pt-1 text-fg-muted">{t("fallback")}</p>
        ) : null}
      </details>
    );
  }

  return (
    <details
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        if (next !== open) setChosen(next);
      }}
      className="spoki-rise w-full"
      data-work-progress
    >
      <summary
        className="group inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-line px-3 text-sm text-fg-muted transition-colors duration-150 marker:content-none hover:border-line-strong hover:text-fg"
        aria-label={`${t("title")} · ${stateLabel}`}
      >
        <Icon
          icon={
            state === "failed" || attention
              ? CircleAlert
              : state === "stopped"
                ? Circle
                : Check
          }
          size={16}
          className={
            state === "failed" || attention ? "text-fg-muted" : "text-signal"
          }
        />
        <span role="status">
          {headline}
          {steps.length > 0 ? ` · ${t("steps", { count: steps.length })}` : ""}
          {total !== null && !thought
            ? ` · ${t("seconds", { seconds: total })}`
            : ""}
        </span>
        <Icon
          icon={ChevronDown}
          size={16}
          className="text-fg-subtle transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-3 pt-3 pl-1">
        {steps.length === 0 ? (
          <p className="t-body-s text-fg-muted">{t("noSteps")}</p>
        ) : (
          <ol className="spoki-feather grid max-h-56 overflow-y-auto py-2">
            {steps.map((step, index) => (
              <li key={step.id} className="spoki-step-in flex gap-3 text-sm">
                {/* The rail: a status mark and a thin line to the next step. */}
                <span className="flex flex-col items-center">
                  <span
                    className={
                      step.status === "completed"
                        ? "mt-0.5 text-fg"
                        : "mt-0.5 text-fg-muted"
                    }
                  >
                    <Icon size={16} icon={stepIcon(step.status)} />
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
                    <span>{t(`tools.${stepForTool(step.name)}`)}</span>
                    {step.ms !== undefined ? (
                      <span className="t-data text-fg-muted tabular-nums">
                        {t("seconds", { seconds: tenths(step.ms) })}
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

/** One step while Spoki works: what runs now, or what a finished one found. */
function LiveStep({
  step,
  label,
  chips,
  result,
  found,
}: {
  step: WorkStep;
  label: string;
  chips: string[];
  result: (count: number) => string;
  found: (count: number) => string;
}) {
  const summary = step.summary;
  const target = summary && "count" in summary ? summary.count : 0;
  const count = useCountUp(target);
  const done = step.status === "completed";
  return (
    <li
      className={`spoki-rise flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 text-sm ${done ? "text-fg" : "text-fg-muted"}`}
    >
      <Icon
        size={16}
        icon={stepIcon(step.status)}
        className={
          step.status === "running"
            ? "text-accent motion-safe:animate-spin"
            : done
              ? "text-signal"
              : undefined
        }
      />
      {step.status === "running" ? (
        <span className="spoki-shimmer">{label}</span>
      ) : summary?.kind === "jobs" ? (
        <>
          {chips.map((chip) => (
            <span
              key={chip}
              className="t-data rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted"
            >
              {chip}
            </span>
          ))}
          {chips.length > 0 ? (
            <span aria-hidden="true" className="text-fg-subtle">
              →
            </span>
          ) : null}
          <span className="tabular-nums">{found(count)}</span>
        </>
      ) : summary ? (
        <span className="tabular-nums">{result(count)}</span>
      ) : (
        <span>{label}</span>
      )}
    </li>
  );
}
