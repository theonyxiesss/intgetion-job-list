import type { ReactNode } from "react";

/**
 * Phone width: a wide table or tab row must scroll inside the page,
 * not push the document sideways. Metrics lives outside AdminShell, so
 * the bound sits on the shared layout.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-w-0 max-w-full overflow-x-hidden">{children}</div>;
}
