import type { FreelanceOrderStatus } from "@/config/freelance";
import { cn } from "@/components/ui/cn";

const STEPS = [
  "sent",
  "accepted",
  "in_progress",
  "delivered",
  "completed",
] as const;
type Step = (typeof STEPS)[number];

/** Current position, not a percentage or an immutable history: revisions can return to work. */
export function OrderSteps({
  status,
  labels,
  label,
}: {
  status: FreelanceOrderStatus;
  labels: Record<Step, string>;
  label: string;
}) {
  const current = STEPS.findIndex((step) => step === status);
  // Closed without delivery is not a successful journey.
  if (current < 0) return null;
  return (
    <ol aria-label={label} className="grid grid-cols-5 gap-2 py-2">
      {STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={index === current ? "step" : undefined}
          className={cn(
            "min-w-0 border-t-2 pt-2 text-[11px] leading-snug break-words",
            index === current
              ? "border-signal font-semibold text-fg"
              : index < current
                ? "border-fg-muted text-fg-muted"
                : "border-line text-fg-muted",
          )}
        >
          <span aria-hidden="true" className="font-mono @min-[440px]:hidden">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="sr-only">{labels[step]}</span>
          <span aria-hidden="true" className="hidden @min-[440px]:inline">
            {labels[step]}
          </span>
        </li>
      ))}
    </ol>
  );
}
