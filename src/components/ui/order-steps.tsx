import {
  ORDER_STEPS,
  type OrderStage,
  type OrderStepName,
  type OrderTone,
} from "@/lib/order-stage";
import { cn } from "./cn";

const LINE: Record<OrderTone, string> = {
  waiting: "border-line-strong",
  work: "border-signal",
  review: "border-warning",
  done: "border-success",
  closed: "border-line-strong",
};

/** The four steps as a line: past, current, still ahead (D603). */
export function OrderSteps({
  stage,
  labels,
  label,
}: {
  stage: OrderStage;
  labels: Record<OrderStepName, string>;
  /** Accessible name of the list. */
  label: string;
}) {
  const { step, tone } = stage;
  return (
    <ol aria-label={label} className="grid grid-cols-4 gap-1.5">
      {ORDER_STEPS.map((name, index) => {
        const state =
          step === null || index > step
            ? "next"
            : index === step
              ? "current"
              : "past";
        return (
          <li
            key={name}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "t-caption min-w-0 border-t-2 pt-2 break-words",
              state === "current"
                ? cn(LINE[tone], "text-fg")
                : tone === "done"
                  ? "border-success text-fg-muted"
                  : state === "past"
                    ? "border-fg-muted text-fg-muted"
                    : "border-line text-fg-subtle",
            )}
          >
            {labels[name]}
          </li>
        );
      })}
    </ol>
  );
}
