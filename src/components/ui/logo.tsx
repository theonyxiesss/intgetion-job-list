/** Orbit and satellite mark (DESIGN.md 2.1). Original artwork, currentColor. */
export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18.36" cy="5.64" r="2.25" fill="currentColor" />
    </svg>
  );
}

/** Wordmark: INTGETION + JOB LIST (the second part from md up). */
export function Logo({ name, sub }: { name: string; sub: string }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark />
      <span className="font-display text-[15px] font-semibold tracking-[0.24em] uppercase">
        {name}
      </span>
      <span className="hidden font-display text-[12px] tracking-[0.24em] uppercase opacity-70 md:inline">
        {sub}
      </span>
    </span>
  );
}
