import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

const box =
  "peer size-[18px] shrink-0 cursor-pointer appearance-none border border-line-strong bg-transparent transition-colors checked:border-accent checked:bg-accent disabled:opacity-40";

/** Checkbox or radio with its text; the whole row is the hit area. */
export function Choice({
  type = "checkbox",
  label,
  hint,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: "checkbox" | "radio";
  label: ReactNode;
  hint?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3",
        className,
      )}
    >
      <span className="relative inline-flex">
        <input
          type={type}
          className={cn(box, type === "radio" && "rounded-full")}
          {...rest}
        />
        {type === "checkbox" ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 18 18"
            className="pointer-events-none absolute inset-0 hidden size-[18px] text-accent-fg peer-checked:block"
          >
            <path
              d="M4 9.5 7.5 13 14 5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            />
          </svg>
        ) : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-[6px] left-[6px] hidden size-1.5 rounded-full bg-accent-fg peer-checked:block"
          />
        )}
      </span>
      <span className="flex flex-col">
        <span>{label}</span>
        {hint && <span className="t-caption text-fg-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** On/off switch for settings (a checkbox with role="switch"). */
export function Switch({
  label,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> & {
  label: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-3",
        className,
      )}
    >
      <span className="relative inline-flex">
        <input
          type="checkbox"
          role="switch"
          aria-label={label}
          className="peer h-5 w-9 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface-2 transition-colors checked:border-accent checked:bg-accent disabled:opacity-40"
          {...rest}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[3px] left-[3px] size-3.5 rounded-full bg-fg-muted transition-transform peer-checked:translate-x-4 peer-checked:bg-accent-fg"
        />
      </span>
    </label>
  );
}
