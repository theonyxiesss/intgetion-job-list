"use client";

import type { ComponentProps, MouseEvent } from "react";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { chatHref, type ChatTarget } from "./spoki-href";
import { useSpoki } from "./spoki-context";

/**
 * A way into Spoki (D525, D531, D532). On desktop, a click keeps the current
 * page and shows the persistent panel; a thread link selects that thread.
 * A new tab, a modified click or no JavaScript still follows `/chat`.
 */
function useSpokiEntry(thread?: ChatTarget) {
  const spoki = useSpoki();
  if (!spoki) return { href: chatHref(thread ?? null) };
  return {
    href: chatHref(thread ?? spoki.target),
    "aria-controls": "spoki-panel",
    // Desktop keeps its persistent panel; narrower layouts toggle as before.
    "aria-expanded": thread ? undefined : spoki.mode !== "hidden",
    onMouseEnter: spoki.preload,
    onFocus: spoki.preload,
    onClick(event: MouseEvent<HTMLAnchorElement>) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      if (thread) spoki.open(thread);
      else if (spoki.mode === "docked") spoki.open();
      else spoki.toggle();
    },
  };
}

export function SpokiLink({
  thread,
  ...rest
}: { thread?: ChatTarget } & Omit<ComponentProps<typeof Link>, "href">) {
  return <Link {...rest} {...useSpokiEntry(thread)} />;
}

export function SpokiButtonLink({
  thread,
  ...rest
}: { thread?: ChatTarget } & Omit<ComponentProps<typeof ButtonLink>, "href">) {
  return <ButtonLink {...rest} {...useSpokiEntry(thread)} />;
}
