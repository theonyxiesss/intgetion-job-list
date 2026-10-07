/**
 * Orbit and four-point star — the founder's chrome artwork (2026-10-07), cut
 * out of its black background into a transparent PNG (`public/brand`). On the
 * light theme the white chrome is inverted to dark chrome (`.logo-img` in
 * globals.css), so it never disappears on white.
 */
/** Width over height of the cut-out artwork. */
const RATIO = 1.63;

/** `size` is the height; the mark is wider than tall. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static PNG, no optimizer round trip
    <img
      src="/brand/logo-32.png"
      srcSet="/brand/logo-32.png 1x, /brand/logo-64.png 2x, /brand/logo-128.png 4x"
      width={Math.round(size * RATIO)}
      height={size}
      alt=""
      aria-hidden="true"
      decoding="async"
      className="logo-img shrink-0"
    />
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
