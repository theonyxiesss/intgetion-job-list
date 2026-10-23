"use client";

import dynamic from "next/dynamic";
import type { ComponentProps, ReactNode } from "react";
import type { DockPreference } from "./spoki-dock-model";

/*
 * The Spoki panel's provider and panel, split from the shell (D525). A server
 * layout cannot code-split a client component it imports, so the layout
 * imports these small wrappers instead: with SPOKI_DOCK off they render
 * nothing of the panel and its code is never loaded; with it on the chunks
 * load with the page and still render on the server.
 */
const Provider = dynamic(() =>
  import("./spoki-provider").then((module) => module.SpokiProvider),
);
const Dock = dynamic(() =>
  import("./spoki-dock").then((module) => module.SpokiDock),
);

export function SpokiShell({
  dock,
  signedIn,
  preference,
  children,
}: {
  dock: boolean;
  signedIn: boolean;
  preference: DockPreference | null;
  children: ReactNode;
}) {
  if (!dock) return children;
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
  dock,
  labels,
  children,
}: {
  dock: boolean;
  labels: ComponentProps<typeof Dock>["labels"];
  children: ReactNode;
}) {
  if (!dock) return children;
  return (
    <div className="flex min-h-0 w-full flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      <Dock labels={labels} />
    </div>
  );
}
