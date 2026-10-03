import { cn } from "./cn";

/**
 * Decorative orbits and a horizon glow (DESIGN.md 9.1). Inline SVG, no
 * images. Slow rotation stops under prefers-reduced-motion.
 */
export function OrbitBackdrop({
  className,
  faint = false,
}: {
  className?: string;
  faint?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        faint && "opacity-50",
        className,
      )}
    >
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,var(--surface-2),transparent_70%)]" />
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full text-line"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <ellipse cx="600" cy="980" rx="900" ry="520" />
          <ellipse cx="600" cy="980" rx="700" ry="400" />
          <ellipse
            cx="600"
            cy="980"
            rx="1100"
            ry="660"
            strokeDasharray="2 10"
          />
        </g>
        <g className="origin-[600px_980px] animate-[ui-orbit_120s_linear_infinite]">
          <circle cx="600" cy="460" r="3" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}
