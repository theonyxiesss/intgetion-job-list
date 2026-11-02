"use client";

import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useRouter } from "@/i18n/navigation";

export type HeaderSearchScope = { path: string; label: string };

/**
 * One search field with a section picker (D592). Every target page reads
 * `q`; without JS the form still lands on the first scope.
 */
export function HeaderSearch({
  label,
  placeholder,
  scopeLabel,
  scopes,
}: {
  label: string;
  placeholder: string;
  scopeLabel: string;
  scopes: readonly HeaderSearchScope[];
}) {
  const router = useRouter();
  const [path, setPath] = useState(scopes[0]?.path ?? "/jobs");

  return (
    <form
      role="search"
      aria-label={label}
      action={path}
      onSubmit={(event) => {
        event.preventDefault();
        const q = String(
          new FormData(event.currentTarget).get("q") ?? "",
        ).trim();
        router.push(q ? { pathname: path, query: { q } } : path);
      }}
      className="flex h-11 w-full max-w-[22rem] items-center rounded-full border border-line-strong bg-bg transition-colors focus-within:border-fg-subtle hover:border-fg-subtle"
    >
      <Icon icon={Search} size={16} className="ml-4 shrink-0 text-fg-muted" />
      <input
        type="search"
        name="q"
        aria-label={placeholder}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] text-fg placeholder:text-fg-subtle"
      />
      <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />
      <span className="relative inline-flex h-full shrink-0 items-center">
        <select
          aria-label={scopeLabel}
          value={path}
          onChange={(event) => setPath(event.target.value)}
          className="h-full cursor-pointer appearance-none rounded-r-full bg-transparent pr-9 pl-3 text-[15px] font-medium text-fg"
        >
          {scopes.map((scope) => (
            <option key={scope.path} value={scope.path}>
              {scope.label}
            </option>
          ))}
        </select>
        <Icon
          icon={ChevronDown}
          size={16}
          className="pointer-events-none absolute right-3 text-fg"
        />
      </span>
    </form>
  );
}
