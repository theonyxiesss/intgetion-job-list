"use client";

import { useEffect, useRef } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { SpokiChat } from "./spoki-chat-lazy";
import { useSpoki } from "./spoki-context";

const tool =
  "inline-flex size-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-fg";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The one Spoki of the site (D525). The same element is the docked column
 * (from 1536 px), the panel over the page (1024–1535 px), the phone screen
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
  const floating = spoki?.floating ?? false;
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

  // A click beside the panel over the page closes it, as Esc does.
  const close = spoki?.close;
  // Only the side panel over a page is modal (1024–1535 px). On a phone the
  // panel leaves the tab bar usable, like the `/chat` page, so it is not.
  const modalNow = floating && !(spoki?.expanded ?? false) && large;
  useEffect(() => {
    if (!modalNow || !close) return;
    function onPointerDown(event: PointerEvent) {
      const node = event.target;
      if (!(node instanceof Node) || panelRef.current?.contains(node)) return;
      // The triggers toggle the panel themselves.
      if (
        node instanceof Element &&
        node.closest("[aria-controls='spoki-panel']")
      )
        return;
      // The header and the phone tab bar stay usable under a side panel.
      if (node instanceof Element && node.closest("header, [data-bottom-nav]"))
        return;
      close?.();
    }
    // Esc closes; Tab stays inside the panel while it covers the page.
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (item) => item.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modalNow, close]);

  if (!spoki) return null;
  const { mode, docked, expanded, target, loaded } = spoki;
  const modal = modalNow;

  return (
    <>
      {modal ? (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 top-16 bottom-0 z-30 hidden bg-bg/70 lg:max-2xl:block"
        />
      ) : null}
      <aside
        ref={panelRef}
        id="spoki-panel"
        aria-label={labels.panel}
        role={modal ? "dialog" : undefined}
        aria-modal={modal || undefined}
        tabIndex={-1}
        data-spoki-mode={mode}
        className={cn(
          "min-h-0 flex-col bg-bg",
          // Hidden unless one of the places below shows it.
          !expanded && "hidden",
          // From 1536 px a part of the layout, beside the page (D525).
          docked &&
            !expanded &&
            "2xl:sticky 2xl:top-16 2xl:flex 2xl:h-[calc(100dvh-4rem)] 2xl:w-[400px] 2xl:shrink-0 2xl:self-start 2xl:border-l 2xl:border-line",
          // Below it, over the page: a side panel, a phone screen under 1024 px.
          floating &&
            !expanded &&
            "chat-shell max-2xl:fixed max-2xl:top-16 max-2xl:right-0 max-2xl:bottom-0 max-2xl:z-40 max-2xl:flex max-lg:left-0 lg:max-2xl:w-[400px] lg:max-2xl:border-l lg:max-2xl:border-line",
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
          ) : (
            <button
              type="button"
              className={cn(tool, "max-lg:hidden")}
              onClick={spoki.expand}
              aria-label={labels.expand}
              title={labels.expand}
            >
              <Icon icon={Maximize2} size={16} />
            </button>
          )}
          <button
            type="button"
            className={tool}
            onClick={spoki.close}
            aria-label={labels.close}
            title={labels.close}
          >
            <Icon icon={X} size={16} />
          </button>
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
