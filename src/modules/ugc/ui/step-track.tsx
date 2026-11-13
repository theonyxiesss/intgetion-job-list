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
    <ol
      aria-label={label}
      className="flex flex-wrap gap-x-1 gap-y-2 in-data-[ui=v2]:grid in-data-[ui=v2]:grid-cols-3 in-data-[ui=v2]:gap-2 sm:in-data-[ui=v2]:grid-cols-6"
    >
      {UGC_STEPS.map((step, index) => {
        const state =
          index < current ? "done" : index === current ? "current" : "next";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className={`t-label flex items-center gap-1 rounded-full border px-3 py-1 in-data-[ui=v2]:min-w-0 in-data-[ui=v2]:flex-col in-data-[ui=v2]:items-start in-data-[ui=v2]:rounded-none in-data-[ui=v2]:border-0 in-data-[ui=v2]:px-0 in-data-[ui=v2]:py-1 in-data-[ui=v2]:font-sans in-data-[ui=v2]:text-xs in-data-[ui=v2]:font-normal in-data-[ui=v2]:normal-case ${
              state === "current"
                ? "border-fg text-fg"
                : state === "done"
                  ? "border-line text-fg-muted"
                  : "border-line text-fg-subtle"
            }`}
          >
            <span
              aria-hidden="true"
              className={`hidden h-1 w-full rounded-full in-data-[ui=v2]:block ${state === "next" ? "bg-line-strong" : "bg-accent"}`}
            />
            <span className="flex min-w-0 items-center gap-1">
              <span aria-hidden="true">
                {state === "done" ? "✓" : `${index + 1}`}
              </span>
              <span className="min-w-0 break-words">{labels[step]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
