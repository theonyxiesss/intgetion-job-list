"use client";

import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  SPOKI_DOCK_COOKIE,
  chatHref,
  pageSection,
  targetKey,
  type ChatTarget,
  type DockPreference,
} from "./spoki-dock-model";
import { preloadSpokiChat } from "./spoki-chat-lazy";
import { SpokiContext, type DockMode, type SpokiDock } from "./spoki-context";

/** From here the panel is part of the layout; below it slides over (D525). */
const WIDE = "(min-width: 1536px)";
/** Below this the panel takes the whole screen, like the chat page. */
const LARGE = "(min-width: 1024px)";

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function savePreference(value: DockPreference) {
  // The person's own choice, kept a year; a UI preference, no data (D525).
  document.cookie = `${SPOKI_DOCK_COOKIE}=${value}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax`;
}

/**
 * One Spoki for the whole site (D525). Lives in the locale layout, so it
 * survives navigation; the panel and `/chat` read the same state.
 */
export function SpokiProvider({
  signedIn,
  preference,
  children,
}: {
  signedIn: boolean;
  /** The saved choice from the cookie, read on the server: no flash. */
  preference: DockPreference | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const wide = useMedia(WIDE);
  const large = useMedia(LARGE);
  // Signed in: open by default on wide screens; guests start closed.
  const [docked, setDocked] = useState(
    preference ? preference === "open" : signedIn,
  );
  const [floating, setFloating] = useState(false);
  const [target, setTarget] = useState<ChatTarget | null>(null);
  const [wanted, setWanted] = useState(false);
  /** The last page under the panel: where "collapse" goes back to. */
  const [lastPage, setLastPage] = useState<string | null>(
    pathname === "/chat" ? null : pathname,
  );
  const [seenPath, setSeenPath] = useState(pathname);
  /** Set by "collapse": the next page keeps the floating panel open. */
  const [keepOpen, setKeepOpen] = useState(false);
  const expanded = pathname === "/chat";

  // Leaving a page closes the panel that covers it; the docked one stays.
  // Adjusted during render, so the new page never shows the old panel.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    if (pathname !== "/chat") {
      setLastPage(pathname);
      if (keepOpen) setKeepOpen(false);
      else setFloating(false);
    }
  }

  const mode: DockMode = expanded
    ? "expanded"
    : wide
      ? docked
        ? "docked"
        : "hidden"
      : floating
        ? large
          ? "overlay"
          : "sheet"
        : "hidden";
  const loaded = wanted || mode !== "hidden";

  const open = useCallback((next?: ChatTarget) => {
    if (next) setTarget(next);
    setWanted(true);
    if (window.matchMedia(WIDE).matches) {
      setDocked(true);
      savePreference("open");
    } else {
      setFloating(true);
    }
  }, []);

  const collapse = useCallback(() => {
    const stay = window.matchMedia(LARGE).matches;
    if (window.matchMedia(WIDE).matches) {
      setDocked(true);
      savePreference("open");
    } else {
      setKeepOpen(stay);
      setFloating(stay);
    }
    router.push(lastPage ?? "/jobs");
  }, [router, lastPage]);

  const close = useCallback(() => {
    if (pathname === "/chat") {
      setKeepOpen(false);
      if (window.matchMedia(WIDE).matches) {
        setDocked(false);
        savePreference("closed");
      }
      router.push(lastPage ?? "/jobs");
      return;
    }
    if (window.matchMedia(WIDE).matches) {
      setDocked(false);
      savePreference("closed");
    } else {
      setFloating(false);
    }
  }, [pathname, router, lastPage]);

  const visible = mode !== "hidden";
  const toggle = useCallback(() => {
    if (visible) close();
    else open();
  }, [visible, close, open]);

  const expand = useCallback(() => {
    setWanted(true);
    router.push(chatHref(target));
  }, [router, target]);

  const preload = useCallback(() => preloadSpokiChat(), []);

  const follow = useCallback((next: ChatTarget) => {
    setTarget((current) =>
      targetKey(current) === targetKey(next) ? current : next,
    );
  }, []);

  const value = useMemo<SpokiDock>(
    () => ({
      signedIn,
      docked,
      floating,
      expanded,
      mode,
      large,
      loaded,
      target,
      targetKey: targetKey(target),
      section: pageSection(expanded ? (lastPage ?? "/") : pathname),
      open,
      close,
      toggle,
      expand,
      collapse,
      preload,
      follow,
    }),
    [
      signedIn,
      docked,
      floating,
      expanded,
      mode,
      large,
      loaded,
      target,
      pathname,
      lastPage,
      open,
      close,
      toggle,
      expand,
      collapse,
      preload,
      follow,
    ],
  );

  return (
    <SpokiContext.Provider value={value}>{children}</SpokiContext.Provider>
  );
}
