"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Filters sit in a column from 1024 px. On a phone they stay in the form
 * (so a submit still works) and open as a full-screen panel.
 */
export function FilterShell({
  count,
  filtersLabel,
  closeLabel,
  children,
}: {
  count: number;
  filtersLabel: string;
  closeLabel: string;
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
            ? "fixed inset-0 z-40 flex flex-col gap-4 overflow-y-auto bg-bg p-4 lg:sticky lg:top-24 lg:inset-auto lg:z-auto lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:bg-transparent lg:p-0"
            : "hidden lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col lg:gap-4 lg:overflow-y-auto"
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
