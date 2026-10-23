"use client";

import type { ComponentProps, MouseEvent } from "react";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { chatHref, type ChatTarget } from "./spoki-href";
import { useSpoki } from "./spoki-context";

/**
 * A way into Spoki (D525). With the panel on, a click opens the panel (with
 * this thread, when one is given) and the page stays; a new tab, a modified
 * click or no JavaScript still follow the `/chat` address. Without the panel
 * it is the plain link it always was.
 */
function useSpokiEntry(thread?: ChatTarget) {
  const spoki = useSpoki();
  if (!spoki) return { href: chatHref(thread ?? null) };
  return {
    href: chatHref(thread ?? spoki.target),
    "aria-controls": "spoki-panel",
    // A bare entry toggles the panel; one with a thread only opens it.
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
