"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usdText } from "@/lib/calc";
import type {
  JobCardsProps,
  ServiceCardsProps,
  UiAction,
} from "@/modules/bot/ui/types";
import { actionById, BlockButton, type BlockHandlers } from "./block-kit";

/** Jobs from a search or matches: open, save, apply (D523). */
export function JobCards({
  props,
  actions,
  handlers,
}: {
  props: JobCardsProps;
  actions: readonly UiAction[];
  handlers: BlockHandlers;
}) {
  const t = useTranslations("chat");
  const explain = useTranslations("explain");
  return (
    <ul className="grid gap-2 @xl:grid-cols-2">
      {props.items.map((job) => (
        <li
          key={job.id}
          className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface-2 px-4 py-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <Link
              href={`/jobs/${job.id}`}
              className="min-w-0 font-medium break-words underline-offset-4 hover:underline"
            >
              {job.title}
            </Link>
            {job.score !== undefined ? (
              <span className="t-label shrink-0 text-signal">
                {t("score", { score: Math.round(job.score * 100) })}
              </span>
            ) : null}
          </div>
          <p className="t-body-s text-fg-muted">
            {job.company}
            {job.workFormat ? ` · ${job.workFormat}` : ""}
          </p>
          {job.explain?.map((line) => (
            <p key={line.detail.key} className="t-body-s text-fg-subtle">
              {explain(
                line.detail.key.replace(/^explain\./, "") as never,
                line.detail.params as never,
              )}
            </p>
          ))}
          <ItemButtons
            ids={job.actions}
            actions={actions}
            handlers={handlers}
          />
        </li>
      ))}
    </ul>
  );
}

/** Ready freelance services: price from, days, open and order (D523). */
export function ServiceCards({
  props,
  actions,
  handlers,
}: {
  props: ServiceCardsProps;
  actions: readonly UiAction[];
  handlers: BlockHandlers;
}) {
  const t = useTranslations("chat.blocks");
  const locale = useLocale();
  return (
    <ul className="grid gap-2 @xl:grid-cols-2">
      {props.items.map((service) => (
        <li
          key={service.id}
          className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface-2 px-4 py-3"
        >
          <p className="font-medium break-words">{service.title}</p>
          <p className="t-body-s text-fg-muted">
            <span className="font-mono">
              {t("from", { price: usdText(service.fromCents, locale) })}
            </span>
            {service.fromDays > 0 ? (
              <>
                {" · "}
                <span className="font-mono">
                  {t("days", { count: service.fromDays })}
                </span>
              </>
            ) : null}
          </p>
          <ItemButtons
            ids={service.actions}
            actions={actions}
            handlers={handlers}
          />
        </li>
      ))}
    </ul>
  );
}

function ItemButtons({
  ids,
  actions,
  handlers,
}: {
  ids: readonly string[];
  actions: readonly UiAction[];
  handlers: BlockHandlers;
}) {
  const shown = ids
    .map((id) => actionById(actions, id))
    .filter((action): action is UiAction => action !== undefined);
  if (shown.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {shown.map((action) => (
        <BlockButton
          key={action.id}
          action={action}
          handlers={handlers}
          variant={action.type === "link" ? "secondary" : "ghost"}
        />
      ))}
    </div>
  );
}
