"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Narrow screens (U4, TZ 48 §8): one section at a time behind three tabs.
 * From md up every section shows in one column, as before. Each panel stays
 * in the DOM, so the tabs only change what is visible.
 */
export function RoomTabs({
  label,
  sections,
}: {
  label: string;
  sections: readonly { key: string; title: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(sections[0]?.key ?? "");
  const base = useId();
  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-1 border-b border-line md:hidden"
      >
        {sections.map((section) => {
          const selected = section.key === active;
          return (
            <button
              key={section.key}
              type="button"
              role="tab"
              id={`${base}-${section.key}-tab`}
              aria-selected={selected}
              aria-controls={`${base}-${section.key}-panel`}
              onClick={() => setActive(section.key)}
              className={`min-h-11 flex-1 border-b-2 px-2 text-sm font-medium ${
                selected
                  ? "border-accent text-fg"
                  : "border-transparent text-fg-muted"
              }`}
            >
              {section.title}
            </button>
          );
        })}
      </div>
      {sections.map((section) => {
        const selected = section.key === active;
        return (
          <div
            key={section.key}
            role="tabpanel"
            id={`${base}-${section.key}-panel`}
            aria-labelledby={`${base}-${section.key}-tab`}
            className={`${selected ? "flex" : "hidden"} flex-col gap-6 md:flex`}
          >
            {section.content}
          </div>
        );
      })}
    </div>
  );
}
