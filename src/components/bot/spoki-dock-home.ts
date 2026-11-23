import type { DockMode } from "./spoki-context";

/**
 * UI 2.0: the home page is already a Spoki chat, so the docked panel beside
 * it would be a second Spoki. Only the docked column hides there; a panel the
 * person opened (sheet on a phone, expanded) still shows.
 * `pathname` is without the locale prefix (next-intl `usePathname`).
 */
export function dockHiddenOnHome(
  enabled: boolean,
  pathname: string,
  mode: DockMode,
): boolean {
  return enabled && pathname === "/" && mode === "docked";
}
