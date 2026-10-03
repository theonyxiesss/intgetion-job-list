import type { ReactNode } from "react";
import { PageTransition } from "@/components/ui";

/** Remounts on every navigation, so page enter/exit transitions fire. */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
