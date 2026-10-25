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
  chatHref,
  pageSection,
  targetKey,
  type ChatTarget,
  type DockPreference,
} from "./spoki-dock-model";
import { preloadSpokiChat } from "./spoki-chat-lazy";
import { SpokiContext, type DockMode, type SpokiDock } from "./spoki-context";

/** Desktop includes laptops: Spoki stays beside the page from 1024 px. */
const WIDE = "(min-width: 1024px)";

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

/**
 * One Spoki for the whole site (D525). Lives in the locale layout, so it
 * survives navigation; the panel and `/chat` read the same state.
 */
export function SpokiProvider({
  signedIn,
  children,
}: {
  signedIn: boolean;
  /** Accepted from older shells; desktop visibility no longer uses a cookie. */
  preference: DockPreference | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const wide = useMedia(WIDE);
  const large = wide;
  const [floating, setFloating] = useState(false);
  const [target, setTarget] = useState<ChatTarget | null>(null);
  const [wanted, setWanted] = useState(false);
  /** The last page under the panel: where "collapse" goes back to. */
  const [lastPage, setLastPage] = useState<string | null>(
    pathname === "/chat" ? null : pathname,
  );
  const [seenPath, setSeenPath] = useState(pathname);
  const expanded = pathname === "/chat";

  // Leaving a page closes the panel that covers it; the docked one stays.
  // Adjusted during render, so the new page never shows the old panel.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    if (pathname !== "/chat") {
      setLastPage(pathname);
      setFloating(false);
    }
  }

  const desktopDocked = wide;
  const mode: DockMode = expanded
    ? "expanded"
    : wide
      ? "docked"
      : floating
        ? "sheet"
        : "hidden";
  // Keep the same chat mounted when a resize temporarily hides its panel.
  if (!wanted && mode !== "hidden") setWanted(true);
  const loaded = wanted || mode !== "hidden";

  const open = useCallback((next?: ChatTarget) => {
    if (next) setTarget(next);
    setWanted(true);
    if (!window.matchMedia(WIDE).matches) {
      setFloating(true);
    }
  }, []);

  const collapse = useCallback(() => {
    setFloating(false);
    router.push(lastPage ?? "/jobs");
  }, [router, lastPage]);

  const close = useCallback(() => {
    if (window.matchMedia(WIDE).matches) {
      // Desktop Spoki is part of the layout and cannot be dismissed (D531).
      if (pathname === "/chat") router.push(lastPage ?? "/jobs");
      return;
    }
    if (pathname === "/chat") {
      router.push(lastPage ?? "/jobs");
      return;
    }
    setFloating(false);
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
      docked: desktopDocked,
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
      desktopDocked,
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
