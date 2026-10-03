"use client";

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

type Toast = { id: number; text: string; tone: "info" | "danger" };

const ToastContext = createContext<{
  show: (text: string, tone?: Toast["tone"]) => void;
} | null>(null);

/**
 * Toasts after an action (DESIGN.md 8.8): info closes itself after 5 s,
 * errors stay until closed and are announced as alerts.
 */
export function ToastProvider({
  children,
  closeLabel,
}: {
  children: ReactNode;
  closeLabel: string;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  );
  const show = useCallback(
    (text: string, tone: Toast["tone"] = "info") => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all.slice(-2), { id, text, tone }]);
      if (tone === "info") setTimeout(() => remove(id), 5000);
    },
    [remove],
  );
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-stretch gap-2 p-4 md:inset-x-auto md:right-6 md:bottom-6 md:w-[380px]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "danger" ? "alert" : "status"}
            className={cn(
              "ui-fade-up pointer-events-auto flex items-start justify-between gap-3 border bg-surface px-4 py-3",
              toast.tone === "danger" ? "border-danger" : "border-line-strong",
            )}
          >
            <p className="t-body-s">{toast.text}</p>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={() => remove(toast.id)}
              className="-m-2 inline-flex size-11 shrink-0 items-center justify-center text-fg-muted hover:text-fg"
            >
              <Icon icon={X} size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast needs a ToastProvider");
  return context;
}
