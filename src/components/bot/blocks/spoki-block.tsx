"use client";

import { Maximize2, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { useSpoki } from "@/components/bot/spoki-context";
import { blockIsStale, type UiBlock } from "@/modules/bot/ui/types";
import type { BlockHandlers } from "./block-kit";
import { Calculator, type CalcValues } from "./calculator";
import { JobCards, ServiceCards } from "./cards";
import { ComparePlans } from "./plans";
import { Choice, Details, Progress } from "./simple";

export type { CalcValues } from "./calculator";

/** Wide blocks: in a narrow panel they offer the full screen. */
const WIDE = new Set(["compare_plans", "calculator"]);

/**
 * One Spoki block (D523) in the panel and on the full screen alike. It is a
 * container: its parts follow the block's own width (`@container`), never
 * the window's, so the same block fits the 400 px panel and `/chat`.
 */
export function SpokiBlock({
  block,
  handlers,
  values,
  onValues,
  note,
  live,
}: {
  block: UiBlock;
  handlers: Omit<BlockHandlers, "stale">;
  values?: CalcValues;
  onValues: (values: CalcValues) => void;
  /** What the last button press ended with. */
  note?: "failed" | "signIn" | "stale";
  /** Arrived in this visit: it fades in once. */
  live?: boolean;
}) {
  const t = useTranslations("chat.blocks");
  const locale = useLocale();
  const spoki = useSpoki();
  const now = useMinute();
  const stale = note === "stale" || (now !== null && blockIsStale(block, now));
  const all: BlockHandlers = { ...handlers, stale };
  const refresh = block.actions.find((action) => action.type === "refresh");
  const canExpand =
    spoki !== null &&
    !spoki.docked &&
    !spoki.expanded &&
    spoki.mode !== "sheet" &&
    WIDE.has(block.component);

  return (
    <section
      data-block={block.component}
      aria-label={t(`label.${block.component}` as never)}
      className={
        live
          ? "ui-fade-up @container min-w-0 rounded-lg border border-line bg-surface p-4"
          : "@container min-w-0 rounded-lg border border-line bg-surface p-4"
      }
    >
      <Body block={block} handlers={all} values={values} onValues={onValues} />
      {stale || refresh || canExpand || note ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {stale ? (
            <p className="t-body-s text-fg-muted">
              {t("stale", {
                time: new Intl.DateTimeFormat(locale, {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(block.source.at)),
              })}
            </p>
          ) : null}
          {note === "failed" || note === "signIn" ? (
            <p role="alert" className="t-body-s text-danger">
              {t(note)}
            </p>
          ) : null}
          <span className="flex-1" />
          {refresh ? (
            <button
              type="button"
              onClick={() => handlers.act(refresh.id)}
              disabled={handlers.busy === refresh.id}
              aria-busy={handlers.busy === refresh.id || undefined}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:opacity-40"
            >
              <Icon icon={RotateCw} size={16} />
              {handlers.busy === refresh.id ? t("refreshing") : refresh.label}
            </button>
          ) : null}
          {canExpand ? (
            <button
              type="button"
              onClick={spoki.expand}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
            >
              <Icon icon={Maximize2} size={16} />
              {t("expand")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Body({
  block,
  handlers,
  values,
  onValues,
}: {
  block: UiBlock;
  handlers: BlockHandlers;
  values?: CalcValues;
  onValues: (values: CalcValues) => void;
}) {
  const shared = { actions: block.actions, handlers };
  switch (block.component) {
    case "job_cards":
      return (
        <JobCards props={(block as UiBlock<"job_cards">).props} {...shared} />
      );
    case "service_cards":
      return (
        <ServiceCards
          props={(block as UiBlock<"service_cards">).props}
          {...shared}
        />
      );
    case "compare_plans":
      return (
        <ComparePlans
          props={(block as UiBlock<"compare_plans">).props}
          {...shared}
        />
      );
    case "calculator":
      return (
        <Calculator
          props={(block as UiBlock<"calculator">).props}
          values={values}
          onValues={onValues}
          {...shared}
        />
      );
    case "choice":
      return <Choice props={(block as UiBlock<"choice">).props} {...shared} />;
    case "progress":
      return (
        <Progress props={(block as UiBlock<"progress">).props} {...shared} />
      );
    case "details":
      return <Details props={(block as UiBlock<"details">).props} />;
    default:
      return (
        <p className="t-body-s whitespace-pre-wrap">{block.fallback.text}</p>
      );
  }
}

/** The time, once a minute: stale marks appear without a reload. */
function useMinute(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  return now;
}
