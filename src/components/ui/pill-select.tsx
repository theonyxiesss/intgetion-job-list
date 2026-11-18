"use client";

import type { ComponentProps } from "react";

/**
 * A filter as a compact pill (UI_V2 catalogs): a native select that applies
 * at once by submitting its form, so the row needs no «Search» button.
 * It is as wide as the chosen option, like the mockup's chips.
 */
export function PillSelect({
  active,
  className = "",
  onChange,
  ...props
}: ComponentProps<"select"> & { active?: boolean }) {
  return (
    <span className="relative inline-flex min-w-0">
      <select
        {...props}
        onChange={(event) => {
          onChange?.(event);
          event.currentTarget.form?.requestSubmit();
        }}
        className={`h-9 min-w-0 cursor-pointer appearance-none rounded-full border pr-8 pl-3.5 text-sm text-fg [field-sizing:content] hover:border-fg-subtle focus-visible:outline-2 focus-visible:outline-accent ${active ? "border-accent bg-surface-2" : "border-line-strong bg-surface"} ${className}`}
      />
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-subtle"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}
