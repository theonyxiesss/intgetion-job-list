import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "./cn";

/** Dense data table (DESIGN.md 8.6); scrolls inside its frame if needed. */
export function Table({
  children,
  caption,
  className,
}: {
  children: ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto border border-line", className)}>
      <table className="t-body-s w-full border-collapse text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Th({
  className,
  numeric = false,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "t-label h-12 border-b border-line px-4 font-medium whitespace-nowrap text-fg-muted",
        numeric && "text-right",
        className,
      )}
      {...rest}
    />
  );
}

export function Tr({
  className,
  ...rest
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-line last:border-b-0 hover:bg-surface-2",
        className,
      )}
      {...rest}
    />
  );
}

export function Td({
  className,
  numeric = false,
  mono = false,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & {
  numeric?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        "h-12 px-4 py-2 align-middle",
        (numeric || mono) && "t-data",
        numeric && "text-right",
        className,
      )}
      {...rest}
    />
  );
}
