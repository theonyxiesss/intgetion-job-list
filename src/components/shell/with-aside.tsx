import type { ReactNode } from "react";

/**
 * The page and its right column of extra information (D477), after
 * jobicy.com. From 1024 px the column stands at the right, 300 px; below
 * that it follows the page. The left rail lives in the layout.
 */
export function WithAside({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:gap-6">
      <div className="flex min-w-0 flex-col gap-8">{children}</div>
      {aside}
    </div>
  );
}
