"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Desktop look: a sticky side column, or a grid above the list (D477). */
const desktop = {
  column: {
    open: "lg:sticky lg:top-24 lg:inset-auto lg:z-auto lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:bg-transparent lg:p-0",
    closed:
      "hidden lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col lg:gap-4 lg:overflow-y-auto",
  },
  grid: {
    open: "lg:static lg:inset-auto lg:z-auto lg:grid lg:grid-cols-3 lg:gap-3 lg:overflow-visible lg:bg-transparent lg:p-0",
    closed: "hidden lg:grid lg:grid-cols-3 lg:gap-3",
  },
};

/**
 * Filters sit in a column (or a grid) from 1024 px. On a phone they stay in
 * the form (so a submit still works) and open as a full-screen panel.
 */
export function FilterShell({
  count,
  filtersLabel,
  closeLabel,
  layout = "column",
  children,
}: {
  count: number;
  filtersLabel: string;
  closeLabel: string;
  layout?: "column" | "grid";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="lg:hidden">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {count > 0 ? `${filtersLabel} (${count})` : filtersLabel}
        </Button>
      </div>
      <div
        className={
          open
            ? `fixed inset-0 z-40 flex flex-col gap-4 overflow-y-auto bg-bg p-4 ${desktop[layout].open}`
            : desktop[layout].closed
        }
      >
        <div className="flex justify-end lg:hidden">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {closeLabel}
          </Button>
        </div>
        {children}
      </div>
    </>
  );
}
