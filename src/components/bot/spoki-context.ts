"use client";

import { createContext, useContext } from "react";
import type { PageSection } from "@/config/page-sections";
import type { ChatTarget } from "./spoki-href";

/**
 * The Spoki panel's context, apart from its provider (D525): the ways into
 * Spoki in the header and the menus import only this, so pages without the
 * panel do not load the panel's code.
 */
export type DockMode = "docked" | "overlay" | "sheet" | "expanded" | "hidden";

export type SpokiDock = {
  signedIn: boolean;
  /** The panel is permanently part of the desktop layout (D531). */
  docked: boolean;
  /** Opened over the page below 1280 px. */
  floating: boolean;
  /** `/chat`: the same chat over the whole page. */
  expanded: boolean;
  /** Where the panel is now; from media queries, so `hidden` until mounted. */
  mode: DockMode;
  large: boolean;
  /** The chat code and its messages are wanted (D525: not before). */
  loaded: boolean;
  target: ChatTarget | null;
  targetKey: string;
  section: PageSection;
  open: (target?: ChatTarget) => void;
  close: () => void;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  /** Warms the chat code, for a hover or a focus on a trigger. */
  preload: () => void;
  /** The thread a `/chat?…` address names. */
  follow: (target: ChatTarget) => void;
};

export const SpokiContext = createContext<SpokiDock | null>(null);

/** The panel, or null where SPOKI_DOCK is off: callers keep their link. */
export function useSpoki(): SpokiDock | null {
  return useContext(SpokiContext);
}
