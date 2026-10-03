"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A 1 px line under the header while the next page loads (DESIGN.md 6.2).
 * Starts on a click on an internal link, shows only after 150 ms, ends
 * when the URL changes.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") {
        return;
      }
      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        (url.pathname === window.location.pathname &&
          url.search === window.location.search)
      ) {
        return;
      }
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setVisible(true), 150);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    window.clearTimeout(timer.current);
    const frame = requestAnimationFrame(() => setVisible(false));
    return () => cancelAnimationFrame(frame);
  }, [pathname, search]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-px overflow-hidden"
    >
      {visible && (
        <span className="block h-px w-1/3 animate-[ui-progress_900ms_var(--ease-out-quint)_infinite] bg-accent" />
      )}
    </div>
  );
}
