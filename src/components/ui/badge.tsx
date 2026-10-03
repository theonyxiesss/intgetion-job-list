import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

export type BadgeTone =
  | "neutral"
  | "verified"
  | "trusted"
  | "imported"
  | "pending"
  | "success"
  | "danger"
  | "new";

const tones: Record<BadgeTone, string> = {
  neutral: "border-line-strong text-fg-muted",
  verified: "border-line-strong text-success",
  trusted: "border-line-strong text-success",
  imported: "border-line-strong text-fg-muted",
  pending: "border-line-strong text-warning",
  success: "border-line-strong text-success",
  danger: "border-line-strong text-danger",
  new: "border-signal text-signal",
};

const toneIcons: Partial<Record<BadgeTone, LucideIcon>> = {
  verified: BadgeCheck,
  trusted: ShieldCheck,
  imported: ArrowUpRight,
};

/** DESIGN.md 8.3: a small outlined label; colour only on text and icon. */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  const glyph = toneIcons[tone];
  return (
    <span
      className={cn(
        "t-label inline-flex h-6 items-center gap-1.5 border px-2 whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {glyph && <Icon icon={glyph} size={16} />}
      {children}
    </span>
  );
}

/** One place that maps statuses to tones (DESIGN.md 8.3). */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "published":
    case "verified":
    case "shortlisted":
    case "interview":
    case "offer":
    case "hired":
    case "confirmed":
    case "approved":
      return "success";
    case "pending_moderation":
    case "pending_verification":
    case "pending":
    case "open":
    case "paused":
    case "viewed":
      return "pending";
    case "removed":
    case "rejected":
    case "suspended":
    case "failed":
      return "danger";
    case "applied":
      return "new";
    default:
      return "neutral";
  }
}

/** A status badge; the caller passes the translated text. */
export function StatusBadge({
  status,
  children,
}: {
  status: string;
  children: ReactNode;
}) {
  return <Badge tone={statusTone(status)}>{children}</Badge>;
}

/** 6 px dot before text, e.g. unread (DESIGN.md 8.3). */
export function StatusDot({
  tone = "new",
  label,
}: {
  tone?: "new" | "warning" | "danger" | "success";
  label?: string;
}) {
  const colors = {
    new: "bg-signal",
    warning: "bg-warning",
    danger: "bg-danger",
    success: "bg-success",
  };
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        colors[tone],
      )}
    />
  );
}

/** Skill or filter chip (DESIGN.md 8.3). */
export function Tag({
  children,
  selected = false,
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "t-body-s inline-flex min-h-8 items-center gap-1 border px-3",
        selected ? "border-accent text-fg" : "border-line text-fg-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
