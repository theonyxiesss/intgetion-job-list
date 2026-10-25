"use client";

import { useEffect, useRef } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { SpokiChat } from "./spoki-chat-lazy";
import { useSpoki } from "./spoki-context";

const tool =
  "inline-flex size-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-fg";

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
  };
}) {
  const spoki = useSpoki();
  const panelRef = useRef<HTMLElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const floating = spoki?.mode === "sheet";
  const large = spoki?.large ?? false;

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
            "lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:w-[360px] lg:shrink-0 lg:self-start lg:border-l lg:border-line 2xl:w-[400px]",
          // Below it, over the page: a side panel, a phone screen under 1024 px.
          floating &&
            !expanded &&
            "chat-shell max-lg:fixed max-lg:inset-x-0 max-lg:top-16 max-lg:bottom-0 max-lg:z-40 max-lg:flex",
          expanded && "chat-shell fixed inset-x-0 top-16 bottom-0 z-40 flex",
        )}
      >
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
