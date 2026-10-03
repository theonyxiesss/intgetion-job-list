import type { ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";
import { LogoMark } from "./logo";

type Tone = "info" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  info: "border-l-line-strong",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
};
const toneIcon: Record<Tone, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};
const toneText: Record<Tone, string> = {
  info: "text-fg-muted",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/** In-flow message with a 2 px status line on the left (DESIGN.md 8.8). */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 border border-line border-l-2 bg-surface px-4 py-3",
        toneClass[tone],
        className,
      )}
    >
      <span className={cn("mt-0.5", toneText[tone])}>
        <Icon icon={toneIcon[tone]} />
      </span>
      <div className="t-body-s flex flex-col gap-1">
        {title && <p className="font-medium text-fg">{title}</p>}
        {children && <div className="text-fg-muted">{children}</div>}
      </div>
    </div>
  );
}

/** Empty list or page (DESIGN.md 8.10). */
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 border border-line px-6 py-16 text-center">
      <span className="text-line-strong">
        <LogoMark size={96} />
      </span>
      <h2 className="t-h3">{title}</h2>
      {text && <p className="max-w-[48ch] text-fg-muted">{text}</p>}
      {action}
    </div>
  );
}

/** Failed block or page, with the request id for support (D48). */
export function ErrorState({
  title,
  text,
  requestId,
  requestIdLabel,
  action,
}: {
  title: string;
  text?: string;
  requestId?: string | null;
  requestIdLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 border border-line px-6 py-16 text-center"
    >
      <span className="text-danger">
        <Icon icon={CircleAlert} size={24} />
      </span>
      <h2 className="t-h3">{title}</h2>
      {text && <p className="max-w-[48ch] text-fg-muted">{text}</p>}
      {action}
      {requestId && (
        <p className="t-caption text-fg-subtle">
          {requestIdLabel} <span className="t-data">{requestId}</span>
        </p>
      )}
    </div>
  );
}

/** Loading placeholder block; shape it with className (DESIGN.md 8.10). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-[ui-pulse_1600ms_ease-in-out_infinite] bg-surface-2",
        className,
      )}
    />
  );
}
