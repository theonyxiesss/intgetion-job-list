/**
 * The platform's orbit-and-star mark in the place of the Morrow mockup's
 * own (TZ 53). `.logo-img` turns it dark on the light theme.
 */
export function MorrowMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static PNG, no optimizer round trip
    <img
      src="/brand/logo-64.png"
      srcSet="/brand/logo-64.png 1x, /brand/logo-128.png 2x"
      width={72}
      height={44}
      alt=""
      aria-hidden="true"
      decoding="async"
      className="logo-img morrow-mark"
    />
  );
}
