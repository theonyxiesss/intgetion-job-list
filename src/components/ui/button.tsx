import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg" | "icon";

const base =
  "relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden border font-display text-[14px] leading-none font-medium tracking-[0.14em] uppercase transition-colors duration-[120ms] ease-[var(--ease-out-quint)] disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-accent bg-accent text-accent-fg hover:bg-transparent hover:text-accent disabled:hover:bg-accent disabled:hover:text-accent-fg",
  secondary:
    "border-line-strong bg-transparent text-fg hover:border-accent disabled:hover:border-line-strong",
  ghost:
    "border-transparent bg-transparent text-fg underline-offset-4 hover:underline disabled:hover:no-underline",
  danger:
    "border-danger bg-transparent text-danger hover:bg-danger hover:text-bg disabled:hover:bg-transparent disabled:hover:text-danger",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-5",
  lg: "min-h-13 px-7",
  icon: "size-11 p-0",
};

/** Class string for anything that should look like a button. */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

function Progress() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-px overflow-hidden"
    >
      <span className="block h-px w-1/2 animate-[ui-progress_900ms_linear_infinite] bg-current" />
    </span>
  );
}

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon element (an <Icon />). */
  icon?: ReactNode;
  /** Trailing icon element, e.g. an arrow for navigation. */
  trailingIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/** DESIGN.md 8.1. One primary button per screen. */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    loading?: boolean;
  }) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon}
      {children}
      {trailingIcon}
      {loading && <Progress />}
    </button>
  );
}

/** A link that looks like a button (locale-aware). */
export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  className,
  children,
  ...rest
}: Common & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
      {trailingIcon}
    </Link>
  );
}
