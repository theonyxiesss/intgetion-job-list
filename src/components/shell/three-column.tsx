import type { ReactNode } from "react";

/**
 * Desktop page in three columns (D477), after jobicy.com: services on the
 * left (from 1280 px), the page in the middle, extra information on the
 * right (from 1024 px; below that it follows the page).
 */
export function ThreeColumn({
  rail,
  aside,
  children,
}: {
  rail: ReactNode;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[220px_minmax(0,1fr)_300px] xl:gap-6">
      {rail}
      <div className="flex min-w-0 flex-col gap-8">{children}</div>
      {aside}
    </div>
  );
}
