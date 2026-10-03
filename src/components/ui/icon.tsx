import type { LucideIcon, LucideProps } from "lucide-react";

/**
 * The one way to draw an icon (DESIGN.md 7): fixed sizes, stroke 1.5,
 * currentColor. Decorative by default; pass `label` for a meaningful icon.
 */
export function Icon({
  icon: Glyph,
  size = 20,
  label,
  ...rest
}: Omit<LucideProps, "size" | "strokeWidth"> & {
  icon: LucideIcon;
  size?: 16 | 20 | 24;
  label?: string;
}) {
  return (
    <Glyph
      size={size}
      strokeWidth={1.5}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      {...rest}
    />
  );
}
