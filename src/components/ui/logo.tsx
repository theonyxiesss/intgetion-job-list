import { useId } from "react";

/**
 * Orbit and four-point star (founder artwork, 2026-10-07). Colours come from
 * CSS tokens on the gradient stops (`.logo-*` in globals.css), so the chrome
 * reads on the dark theme and stays visible on the light one. Ids are unique
 * per render: the mark appears in the header and the footer of one page.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  const chrome = `${id}-chrome`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="76 42 500 500"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={chrome} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="logo-hi" />
          <stop offset="0.3" className="logo-mid" />
          <stop offset="0.5" className="logo-hi" />
          <stop offset="0.75" className="logo-lo" />
          <stop offset="1" className="logo-hi" />
        </linearGradient>
      </defs>
      <path
        d="M86 292 A240 70 0 1 0 566 292 A240 70 0 1 0 86 292 Z M112 287 A224 56 0 1 0 560 287 A224 56 0 1 0 112 287 Z"
        transform="rotate(-24 326 292)"
        fill={`url(#${chrome})`}
        fillRule="evenodd"
      />
      <path
        d="M300 158 C346 284 352 290 514 287 C354 300 352 304 448 448 C346 310 344 308 236 325 C342 300 346 292 300 158 Z"
        fill={`url(#${chrome})`}
      />
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
