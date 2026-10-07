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
  const star = `${id}-star`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="150 120 760 760"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={chrome} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="logo-hi" />
          <stop offset="0.28" className="logo-mid" />
          <stop offset="0.5" className="logo-hi" />
          <stop offset="0.72" className="logo-lo" />
          <stop offset="1" className="logo-hi" />
        </linearGradient>
        <linearGradient id={star} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="logo-hi" />
          <stop offset="0.45" className="logo-mid" />
          <stop offset="0.7" className="logo-hi" />
          <stop offset="1" className="logo-lo" />
        </linearGradient>
      </defs>
      <path
        d="M180 650 C265 430 535 245 820 260 C870 263 889 291 850 322 C760 392 650 390 595 382"
        stroke={`url(#${chrome})`}
        strokeWidth="25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M835 322 C760 365 660 430 520 545 C390 650 280 727 205 715 C170 709 166 686 180 650"
        stroke={`url(#${chrome})`}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M530 350 C545 405 566 433 620 450 C566 459 537 481 520 535 C505 485 480 461 425 449 C479 435 508 408 530 350 Z"
        fill={`url(#${star})`}
        className="logo-edge"
        strokeWidth="3"
      />
      <path d="M530 350 L553 285 L542 405 Z" fill={`url(#${star})`} />
      <path d="M620 450 L720 449 L555 466 Z" fill={`url(#${star})`} />
      <path d="M520 535 L535 625 L505 482 Z" fill={`url(#${star})`} />
      <path d="M425 449 L330 462 L495 433 Z" fill={`url(#${star})`} />
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
