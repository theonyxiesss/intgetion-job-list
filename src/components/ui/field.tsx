import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "./cn";

/** Shared control look (DESIGN.md 8.2). */
export const controlClass =
  "w-full min-h-11 border border-line-strong bg-surface-2 px-3 text-fg placeholder:text-fg-subtle transition-colors duration-[120ms] focus-visible:border-accent aria-[invalid=true]:border-danger disabled:opacity-40";

/**
 * Label above, help and error below, wired with aria-describedby. The
 * child control gets `id`, `aria-invalid` and `aria-describedby`.
 */
export function Field({
  label,
  help,
  error,
  children,
  className,
  required,
}: {
  label: string;
  help?: string;
  error?: string | null;
  children: ReactElement<Record<string, unknown>>;
  className?: string;
  required?: boolean;
}) {
  const generated = useId();
  const own = isValidElement(children)
    ? (children.props.id as string | undefined)
    : undefined;
  const id = own ?? generated;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        required,
      })
    : children;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="t-label text-fg-muted">
        {label}
      </label>
      {control}
      {help && (
        <p id={helpId} className="t-caption text-fg-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="t-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** A titled group of fields, separated by a line. */
export function FieldGroup({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-line pt-6">
      <legend className="t-h3 mb-2">{legend}</legend>
      {children}
    </fieldset>
  );
}
