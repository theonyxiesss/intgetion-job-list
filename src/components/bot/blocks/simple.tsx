"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import type {
  ChoiceProps,
  DetailsProps,
  ProgressProps,
  UiAction,
} from "@/modules/bot/ui/types";
import { actionById, BlockButton, type BlockHandlers } from "./block-kit";

/** Answers to tap; each is sent as the person's own message (D523). */
export function Choice({
  props,
  actions,
  handlers,
}: {
  props: ChoiceProps;
  actions: readonly UiAction[];
  handlers: BlockHandlers;
}) {
  const options = props.options
    .map((id) => actionById(actions, id))
    .filter((action): action is UiAction => action !== undefined);
  const answered = options.some((option) => handlers.done.includes(option.id));
  return (
    <div className="grid gap-3">
      {props.question ? <p className="font-medium">{props.question}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <BlockButton
            key={option.id}
            action={option}
            handlers={
              answered
                ? { ...handlers, done: options.map((o) => o.id) }
                : handlers
            }
          />
        ))}
      </div>
    </div>
  );
}

/** How far a draft is, what is still missing, and its form (D523). */
export function Progress({
  props,
  actions,
  handlers,
}: {
  props: ProgressProps;
  actions: readonly UiAction[];
  handlers: BlockHandlers;
}) {
  const t = useTranslations("chat.blocks.progress");
  const chat = useTranslations("chat");
  const filled = Math.max(props.total - props.missing.length, 0);
  const action = actionById(actions, props.action);
  const fields =
    props.draft === "ugc_brief"
      ? "ugcDraft.fields"
      : props.draft === "freelance_service"
        ? "freelanceDraft.fields"
        : "jobDraft.fields";
  const label = (key: string) =>
    chat.has(`${fields}.${key}` as never)
      ? chat(`${fields}.${key}` as never)
      : key;
  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium">{t(`title.${props.draft}`)}</p>
        <p className="t-body-s font-mono text-fg-muted">
          {t("filled", { filled, total: props.total })}
        </p>
      </div>
      <progress
        value={filled}
        max={props.total}
        aria-label={t("filled", { filled, total: props.total })}
        className="h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:bg-accent [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-200"
      />
      {props.missing.length ? (
        <p className="t-body-s text-fg-muted">
          {t("missing")}: {props.missing.map(label).join(", ")}
        </p>
      ) : null}
      {action ? (
        <div>
          <BlockButton action={action} handlers={handlers} />
        </div>
      ) : null}
    </div>
  );
}

/** Sections to open one by one; native, so keyboard and readers know it. */
export function Details({ props }: { props: DetailsProps }) {
  return (
    <div className="grid gap-2">
      {props.title ? <p className="font-medium">{props.title}</p> : null}
      {props.sections.map((section, index) => (
        <details
          key={`${index}-${section.title}`}
          className="group rounded-lg border border-line"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 font-medium [&::-webkit-details-marker]:hidden">
            {section.title}
            <Icon
              icon={ChevronDown}
              size={16}
              className="shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <p className="t-body-s px-4 pb-3 whitespace-pre-wrap text-fg-muted">
            {section.text}
          </p>
        </details>
      ))}
    </div>
  );
}
