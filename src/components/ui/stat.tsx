import type { ReactNode } from "react";
import { cn } from "./cn";

/** Label above a monospaced value: the telemetry readout (DESIGN.md 8.4). */
export function Stat({
  label,
  value,
  large = false,
  muted = false,
  className,
}: {
  label: string;
  value: ReactNode;
  large?: boolean;
  /** For "not specified" values. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <dt className="t-label text-fg-muted">{label}</dt>
      <dd
        className={cn(
          large ? "t-data-l" : "t-data",
          muted ? "text-fg-subtle" : "text-fg",
          "break-words",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * A row of Stats split by thin vertical lines; a 2-column grid on phones.
 * Children must be <Stat /> elements.
 */
export function StatRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-6 md:flex md:flex-wrap md:gap-0 md:[&>*]:border-l md:[&>*]:border-line md:[&>*]:px-6 md:[&>*:first-child]:border-l-0 md:[&>*:first-child]:pl-0",
        className,
      )}
    >
      {children}
    </dl>
  );
}
