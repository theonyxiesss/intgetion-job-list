"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button, Dialog, Input } from "@/components/ui";
import type { AdminNavItem } from "./admin-nav";

export function AdminCommand({
  items,
  label,
  placeholder,
  empty,
  closeLabel,
}: {
  items: AdminNavItem[];
  label: string;
  placeholder: string;
  empty: string;
  closeLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.label.toLowerCase().includes(needle));
  }, [items, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
        title={label}
        closeLabel={closeLabel}
      >
        <div className="flex flex-col gap-3 px-6 py-4">
          <Input
            value={query}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={(event) => setQuery(event.target.value)}
          />
          {matches.length === 0 ? (
            <p className="text-fg-muted">{empty}</p>
          ) : (
            <ul className="flex flex-col">
              {matches.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="t-nav flex min-h-11 w-full items-center px-2 text-left text-fg hover:bg-surface-2"
                    onClick={() => {
                      setOpen(false);
                      router.push(item.href);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>
    </>
  );
}
