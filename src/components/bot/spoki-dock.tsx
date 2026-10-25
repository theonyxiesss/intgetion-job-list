"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { SpokiChat } from "./spoki-chat-lazy";
import { useSpoki } from "./spoki-context";

const tool =
  "inline-flex size-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-fg";
const dockWidths = [
  300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500, 520, 540, 560,
] as const;
const widthClasses = [
  "lg:w-[300px]",
  "lg:w-[320px]",
  "lg:w-[340px]",
  "lg:w-[360px]",
  "lg:w-[380px]",
  "lg:w-[400px]",
  "lg:w-[420px]",
  "lg:w-[440px]",
  "lg:w-[460px]",
  "lg:w-[480px]",
  "lg:w-[500px]",
  "lg:w-[520px]",
  "lg:w-[540px]",
  "lg:w-[560px]",
];
const WIDTH_KEY = "spoki_dock_width";
let volatileDockWidth = 360;

function widthIndex(width: number) {
  return dockWidths.reduce(
    (best, candidate, index) =>
      Math.abs(candidate - width) < Math.abs(dockWidths[best] - width)
        ? index
        : best,
    3,
  );
}

function getDockWidth() {
  try {
    const saved = Number(window.localStorage.getItem(WIDTH_KEY));
    if (Number.isFinite(saved) && saved > 0)
      return dockWidths[widthIndex(saved)];
    return window.matchMedia("(min-width: 1536px)").matches ? 400 : 360;
  } catch {
    return volatileDockWidth;
  }
}

function subscribeDockWidth(onChange: () => void) {
  window.addEventListener("spoki-dock-width", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("spoki-dock-width", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The one Spoki of the site (D525). The same element is the docked column
 * (from 1024 px), the phone/tablet screen
 * and the full screen of `/chat`: only its classes change, so the chat
 * inside keeps its thread, the text being typed and an answer still coming.
 */
export function SpokiDock({
  labels,
}: {
  labels: {
    panel: string;
    title: string;
    expand: string;
    collapse: string;
    close: string;
    loading: string;
    resize: string;
  };
}) {
  const spoki = useSpoki();
  const panelRef = useRef<HTMLElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const width = useSyncExternalStore(
    subscribeDockWidth,
    getDockWidth,
    () => 360,
  );
  const floating = spoki?.mode === "sheet";
  const large = spoki?.large ?? false;

  const setDockWidth = (next: number) => {
    const clamped =
      dockWidths[
        Math.max(0, Math.min(dockWidths.length - 1, widthIndex(next)))
      ];
    volatileDockWidth = clamped;
    try {
      window.localStorage.setItem(WIDTH_KEY, String(clamped));
    } catch {
      // Resizing remains available for this page when storage is unavailable.
    }
    window.dispatchEvent(new Event("spoki-dock-width"));
  };

  // A panel over the page takes the focus and gives it back on close.
  useEffect(() => {
    if (!floating) {
      returnTo.current?.focus();
      returnTo.current = null;
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && !panelRef.current?.contains(active))
      returnTo.current = active;
    // After the classes show the panel; the field when the chat is there.
    // On a phone the panel itself: the field would pop the keyboard up.
    const timer = setTimeout(() => {
      const field = large ? panelRef.current?.querySelector("textarea") : null;
      (field ?? panelRef.current)?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [floating, large]);

  if (!spoki) return null;
  const { mode, docked, expanded, target, loaded } = spoki;

  return (
    <>
      <aside
        ref={panelRef}
        id="spoki-panel"
        aria-label={labels.panel}
        tabIndex={-1}
        data-spoki-mode={mode}
        className={cn(
          "min-h-0 flex-col bg-bg",
          // Hidden unless one of the places below shows it.
          !expanded && "hidden",
          // From 1024 px a permanent part of the layout, beside the page.
          docked &&
            !expanded &&
            `relative lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:shrink-0 lg:self-start lg:border-l lg:border-line ${widthClasses[widthIndex(width)]}`,
          // Below it, over the page: a side panel, a phone screen under 1024 px.
          floating &&
            !expanded &&
            "chat-shell max-lg:fixed max-lg:inset-x-0 max-lg:top-16 max-lg:bottom-0 max-lg:z-40 max-lg:flex",
          expanded && "chat-shell fixed inset-x-0 top-16 bottom-0 z-40 flex",
        )}
      >
        {docked && !expanded ? (
          <div
            role="slider"
            aria-label={labels.resize}
            aria-orientation="vertical"
            aria-valuemin={dockWidths[0]}
            aria-valuemax={dockWidths[dockWidths.length - 1]}
            aria-valuenow={width}
            aria-valuetext={`${width}px`}
            tabIndex={0}
            className="absolute top-0 bottom-0 left-[-6px] z-10 hidden w-3 cursor-col-resize touch-none items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent lg:flex"
            onPointerDown={(event) => {
              drag.current = { x: event.clientX, width };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (drag.current)
                setDockWidth(
                  drag.current.width + drag.current.x - event.clientX,
                );
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setDockWidth(width + 20);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                setDockWidth(width - 20);
              }
              if (event.key === "Home") {
                event.preventDefault();
                setDockWidth(dockWidths[0]);
              }
              if (event.key === "End") {
                event.preventDefault();
                setDockWidth(dockWidths[dockWidths.length - 1]);
              }
            }}
          >
            <span className="h-10 w-px bg-line" />
          </div>
        ) : null}
        <div className="flex h-14 shrink-0 items-center gap-1 border-b border-line pr-2 pl-4">
          <h2 className="flex-1 truncate text-sm font-medium">
            {labels.title}
          </h2>
          {expanded ? (
            <button
              type="button"
              className={cn(tool, "max-lg:hidden")}
              onClick={spoki.collapse}
              aria-label={labels.collapse}
              title={labels.collapse}
            >
              <Icon icon={Minimize2} size={16} />
            </button>
          ) : !docked ? (
            <button
              type="button"
              className={cn(tool, "max-lg:hidden")}
              onClick={spoki.expand}
              aria-label={labels.expand}
              title={labels.expand}
            >
              <Icon icon={Maximize2} size={16} />
            </button>
          ) : null}
          {!docked ? (
            <button
              type="button"
              className={tool}
              onClick={spoki.close}
              aria-label={labels.close}
              title={labels.close}
            >
              <Icon icon={X} size={16} />
            </button>
          ) : null}
        </div>
        {loaded ? (
          <SpokiChat
            chatKey={spoki.targetKey}
            target={target}
            section={spoki.section}
            signedIn={spoki.signedIn}
            fallback={<Loading text={labels.loading} />}
          />
        ) : null}
      </aside>
    </>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <p role="status" className="t-body-s px-4 py-6 text-fg-muted">
      {text}
    </p>
  );
}
