"use client";

import { useTranslations } from "next-intl";
import type { CompareJobsProps, UiAction } from "@/modules/bot/ui/types";
import { actionById, BlockButton, type BlockHandlers } from "./block-kit";

/**
 * Jobs side by side (D560): the same fields in the same order in every
 * card, from the catalog. A field the job does not state reads "Not stated".
 * One column in a narrow panel, two as the block grows.
 */
export function CompareJobs({
  props,
  actions,
  handlers,
}: {
  props: CompareJobsProps;
  actions: readonly UiAction[];
  handlers: BlockHandlers;
}) {
  const t = useTranslations("chat.blocks.compareJobs");
  return (
    <ul className="grid gap-2 @lg:grid-cols-2">
      {props.items.map((item) => {
        const action = actionById(actions, item.action);
        return (
          <li
            key={item.id}
            className="flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface-2 p-4"
          >
            <div className="min-w-0">
              <p className="font-medium break-words">{item.title}</p>
              <p className="t-body-s text-fg-muted">{item.company}</p>
            </div>
            <dl className="grid gap-1.5">
              {props.criteria.map((name, index) => {
                const value = item.values[index] ?? null;
                return (
                  <div key={name} className="flex justify-between gap-3">
                    <dt className="t-body-s text-fg-muted">{name}</dt>
                    <dd
                      className={
                        value === null
                          ? "t-body-s text-right text-fg-muted"
                          : /\d/.test(value)
                            ? "t-body-s text-right font-mono"
                            : "t-body-s text-right"
                      }
                    >
                      {value ?? t("unknown")}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {action ? (
              <BlockButton
                action={action}
                handlers={handlers}
                variant="secondary"
                className="mt-auto w-full"
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
