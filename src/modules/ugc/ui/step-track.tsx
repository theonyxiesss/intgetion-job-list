import { stepIndex, UGC_STEPS, type UgcProgress } from "../service/progress";

/**
 * Where a UGC brief stands: six steps, past ones done, the current one
 * marked (D464). Server component; labels come from `ugcHub.steps`.
 */
export function StepTrack({
  progress,
  labels,
  label,
}: {
  progress: UgcProgress;
  labels: Record<(typeof UGC_STEPS)[number], string>;
  /** Accessible name of the list. */
  label: string;
}) {
  const current = stepIndex(progress.step);
  return (
    <ol aria-label={label} className="flex flex-wrap gap-x-1 gap-y-2">
      {UGC_STEPS.map((step, index) => {
        const state =
          index < current ? "done" : index === current ? "current" : "next";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className={`t-label flex items-center gap-1 rounded-full border px-3 py-1 ${
              state === "current"
                ? "border-fg text-fg"
                : state === "done"
                  ? "border-line text-fg-muted"
                  : "border-line text-fg-subtle"
            }`}
          >
            <span aria-hidden="true">
              {state === "done" ? "✓" : `${index + 1}`}
            </span>
            {labels[step]}
          </li>
        );
      })}
    </ol>
  );
}
