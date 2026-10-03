import type { ReactNode } from "react";
import { cn } from "./cn";

/** Page container (DESIGN.md 5): 1280 wide, or 720 for forms and text. */
export function Container({
  children,
  narrow = false,
  className,
}: {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 md:px-6 xl:px-12",
        narrow ? "max-w-[768px]" : "max-w-[1376px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A page section with the vertical rhythm of the design. */
export function Section({
  children,
  className,
  bordered = false,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        "py-16 md:py-24",
        bordered && "border-y border-line",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Page heading block: optional label above an H1 and an intro line. */
export function PageHeader({
  title,
  label,
  intro,
  actions,
}: {
  title: string;
  label?: string;
  intro?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-3">
        {label && <p className="t-label text-fg-muted">{label}</p>}
        <h1 className="t-display-l">{title}</h1>
        {intro && <p className="max-w-[68ch] text-fg-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
