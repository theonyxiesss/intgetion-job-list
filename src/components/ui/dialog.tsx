"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";
import { Icon } from "./icon";

/**
 * Modal built on <dialog> (DESIGN.md 8.9): the browser gives the focus
 * trap, Esc and the top layer; focus returns to the opener on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  closeLabel,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClose={() => {
        onClose();
        if (opener.current instanceof HTMLElement) opener.current.focus();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-[560px] border border-line-strong bg-surface p-0 text-fg backdrop:bg-overlay"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <h2 id="dialog-title" className="t-h3">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={closeLabel}
          onClick={() => ref.current?.close()}
          icon={<Icon icon={X} />}
        />
      </div>
      <div className="px-6 py-5">{children}</div>
      {footer && (
        <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}

/**
 * Confirmation card for one consequential action: apply, express
 * interest, save a profile proposed by the bot (DESIGN.md 8.9, 12.3).
 */
export function ConfirmCard({
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}: {
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-4 border border-line-strong bg-surface p-5"
    >
      <h3 className="t-h3">{title}</h3>
      {children && <div className="t-body-s text-fg-muted">{children}</div>}
      <div className="flex flex-wrap gap-3">
        <Button
          variant={danger ? "danger" : "primary"}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
      </div>
    </section>
  );
}
