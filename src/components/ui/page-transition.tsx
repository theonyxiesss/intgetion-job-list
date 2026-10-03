import { ViewTransition, type ReactNode } from "react";

/**
 * Page content transition (DESIGN.md 6.2): a crossfade by default, a
 * directional slide for links tagged `nav-forward` / `nav-back`. Used by
 * `app/[locale]/template.tsx`, which remounts on every navigation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const types = {
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    default: "auto",
  };
  return (
    <ViewTransition enter={types} exit={types} default="none">
      {children}
    </ViewTransition>
  );
}

/** Link props for going one level deeper or back up (DESIGN.md 6.2). */
export const navForward = { transitionTypes: ["nav-forward"] };
export const navBack = { transitionTypes: ["nav-back"] };

/**
 * An element that morphs between pages or positions (job title, company
 * logo, tab underline). React sets the transition name from JS during the
 * transition only, so the CSP's ban on inline style attributes is kept.
 */
export function Morph({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
