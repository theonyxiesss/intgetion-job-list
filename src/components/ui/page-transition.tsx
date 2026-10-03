import { ViewTransition, type ReactNode } from "react";

/**
 * Page content transition (DESIGN.md 6.2): a crossfade for links tagged
 * `nav-fade`, a directional slide for `nav-forward` / `nav-back`. Untyped
 * transitions do nothing — Next hydrates inside a transition, and animating
 * that pushed the first paint of the page past the LCP budget (D145).
 * Used by `app/[locale]/template.tsx`, which remounts on every navigation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const types = {
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    "nav-fade": "auto",
    default: "none",
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
/** Link props for a plain crossfade: header, menus, footer, tabs. */
export const navFade = { transitionTypes: ["nav-fade"] };

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
