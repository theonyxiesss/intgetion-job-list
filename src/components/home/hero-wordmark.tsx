/**
 * The product name drawn as a large outline above the home hero, the way
 * nextjs.org draws NEXT (D428). The outline is white on the dark theme; a
 * short highlight runs along it and stops under reduced motion. Decorative:
 * the H1 below carries the meaning.
 */
export function HeroWordmark({ name }: { name: string }) {
  const text = (className: string) => (
    <text
      x="550"
      y="172"
      textAnchor="middle"
      fontSize="208"
      textLength="1090"
      lengthAdjust="spacingAndGlyphs"
      className={className}
    >
      {name}
    </text>
  );
  return (
    <svg
      viewBox="0 0 1100 200"
      aria-hidden="true"
      focusable="false"
      className="hero-wordmark block h-auto w-full max-w-[1100px] overflow-visible"
    >
      {text("hero-wordmark-base")}
      {text("hero-wordmark-run")}
    </svg>
  );
}
