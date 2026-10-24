"use client";

import { Link } from "@/i18n/navigation";
import { buttonClass, type ButtonVariant } from "@/components/ui/button";
import type { UiAction } from "@/modules/bot/ui/types";

/**
 * What a block can ask of the chat (D523). The chat owns the conversation:
 * a reply is sent as the person's message, a server action goes through
 * `/api/bot/ui/action`. Links are plain links of this site.
 */
export type BlockHandlers = {
  reply: (actionId: string, text: string) => void;
  act: (actionId: string) => void;
  /** The button that waits for the server now. */
  busy: string | null;
  /** Buttons already pressed (a saved job stays saved after a reload). */
  done: readonly string[];
  /** Spoki is answering: replies wait. */
  sending: boolean;
  /** Old data: write buttons wait for a refresh. */
  stale: boolean;
};

export function actionById(
  actions: readonly UiAction[],
  id: string | undefined,
): UiAction | undefined {
  return id ? actions.find((action) => action.id === id) : undefined;
}

/** One button of a block, whatever it does. */
export function BlockButton({
  action,
  handlers,
  variant = "secondary",
  className,
}: {
  action: UiAction;
  handlers: BlockHandlers;
  variant?: ButtonVariant;
  className?: string;
}) {
  const style = buttonClass(variant, "md", className);
  if (action.type === "link") {
    return (
      <Link href={action.path} className={style}>
        {action.label}
      </Link>
    );
  }
  if (action.type === "reply") {
    const chosen = handlers.done.includes(action.id);
    return (
      <button
        type="button"
        className={style}
        aria-pressed={chosen || undefined}
        disabled={handlers.sending || chosen}
        onClick={() => handlers.reply(action.id, action.text)}
      >
        {action.label}
      </button>
    );
  }
  if (action.type === "action") {
    const done = handlers.done.includes(action.id);
    const busy = handlers.busy === action.id;
    return (
      <button
        type="button"
        className={style}
        aria-busy={busy || undefined}
        disabled={done || busy || (action.write && handlers.stale)}
        onClick={() => handlers.act(action.id)}
      >
        {done ? action.doneLabel : action.label}
      </button>
    );
  }
  return null;
}
