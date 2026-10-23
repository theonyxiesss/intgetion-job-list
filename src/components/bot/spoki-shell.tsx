"use client";

import dynamic from "next/dynamic";
import type { ComponentProps, ReactNode } from "react";
import type { DockPreference } from "./spoki-dock-model";

/*
 * The Spoki panel's provider and panel, split from the shell (D525). A server
 * layout cannot code-split a client component it imports, so the layout
 * imports these small wrappers and renders them only with SPOKI_DOCK on:
 * the panel's chunks then load with the page and still render on the
 * server; with it off nothing of the panel is loaded.
 */
const Provider = dynamic(() =>
  import("./spoki-provider").then((module) => module.SpokiProvider),
);
const Dock = dynamic(() =>
  import("./spoki-dock").then((module) => module.SpokiDock),
);

export function SpokiShell({
  signedIn,
  preference,
  children,
}: {
  signedIn: boolean;
  preference: DockPreference | null;
  children: ReactNode;
}) {
  return (
    <Provider signedIn={signedIn} preference={preference}>
      {children}
    </Provider>
  );
}

/**
 * The page and, at its right, the one Spoki panel. It sits in the layout,
 * outside the template, so navigation never remounts it.
 */
export function SpokiRow({
  labels,
  children,
}: {
  labels: ComponentProps<typeof Dock>["labels"];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      <Dock labels={labels} />
    </div>
  );
}
