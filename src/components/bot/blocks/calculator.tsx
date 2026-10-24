"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  clampStep,
  freelanceOrder,
  hiringCost,
  ugcBudget,
  usdText,
} from "@/lib/calc";
import type {
  CalcInput,
  CalculatorProps,
  UiAction,
} from "@/modules/bot/ui/types";
import { actionById, BlockButton, type BlockHandlers } from "./block-kit";

export type CalcValues = Record<string, number | string>;

/** Inputs in cents are shown as dollars; the rest are counts. */
const MONEY = new Set(["rewardCents", "priceCents"]);

/**
 * A cost with sliders (D523). Every number is worked out here, at once and
 * without Spoki: the formulas in `src/lib/calc`, the prices and ranges from
 * the server. The values live in the chat entry, so they stay when the
 * panel goes full screen or the block draws again.
 */
export function Calculator({
  props,
  actions,
  handlers,
  values,
  onValues,
}: {
  props: CalculatorProps;
  actions: readonly UiAction[];
  handlers: BlockHandlers;
  values?: CalcValues;
  onValues: (values: CalcValues) => void;
}) {
  const t = useTranslations("chat.blocks.calc");
  const plans = useTranslations("chat.blocks.plans");
  const locale = useLocale();
  const [state, setState] = useState<CalcValues>(() => ({
    ...Object.fromEntries(
      props.inputs.map((input) => [input.name, input.value]),
    ),
    ...(props.billing ? { billing: props.billing } : {}),
    ...values,
  }));
  // Kept in the chat a moment after the last move, not on every step.
  const save = useRef(onValues);
  useEffect(() => {
    save.current = onValues;
  });
  useEffect(() => {
    const timer = setTimeout(() => save.current(state), 250);
    return () => clearTimeout(timer);
  }, [state]);

  const number = (input: CalcInput) =>
    clampStep(
      Number(state[input.name] ?? input.value),
      input.min,
      input.max,
      input.step,
    );
  const value = (name: string) => {
    const input = props.inputs.find((item) => item.name === name);
    return input ? number(input) : 0;
  };
  const money = (cents: number) => usdText(cents, locale);
  const formula = props.formula;

  let result: React.ReactNode = null;
  if (formula === "ugc_budget") {
    const { totalCents } = ugcBudget({
      videos: value("videos"),
      rewardCents: value("rewardCents"),
    });
    result = <Total label={t("total")} value={money(totalCents)} />;
  } else if (formula === "freelance_order") {
    const { totalCents } = freelanceOrder({
      priceCents: value("priceCents"),
      quantity: value("quantity"),
    });
    result = <Total label={t("total")} value={money(totalCents)} />;
  } else if (props.prices) {
    const billing = state.billing === "year" ? "year" : "month";
    const cost = hiringCost(
      { jobsPerMonth: value("jobsPerMonth"), billing },
      props.prices,
    );
    result = (
      <div className="grid gap-3">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={plans("billing")}
        >
          {(["month", "year"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={billing === option}
              onClick={() => setState((now) => ({ ...now, billing: option }))}
              className={
                billing === option
                  ? "min-h-11 rounded-full border border-line-strong bg-surface-2 px-4 text-fg"
                  : "min-h-11 rounded-full border border-line px-4 text-fg-muted hover:text-fg"
              }
            >
              {plans(option)}
            </button>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-2">
          <Cost
            label={t("hiring_cost.hire")}
            value={money(cost.hireCents)}
            note={t("perMonth")}
            best={cost.cheaper === "hire" && cost.savingCents > 0}
          />
          <Cost
            label={t("hiring_cost.team")}
            value={money(cost.teamCents)}
            note={t("perMonth")}
            best={cost.cheaper === "team" && cost.savingCents > 0}
          />
        </dl>
        <p className="t-body-s text-fg" aria-live="polite">
          {cost.savingCents > 0
            ? t("hiring_cost.cheaper", {
                plan:
                  cost.cheaper === "hire"
                    ? t("hiring_cost.hire")
                    : t("hiring_cost.team"),
                saving: money(cost.savingCents),
              })
            : t("hiring_cost.same")}
        </p>
        <p className="t-body-s text-fg-muted">
          {t("hiring_cost.breakEven", { count: cost.breakEvenJobs })}
        </p>
      </div>
    );
  }

  const range = props.range;
  const shownActions = props.actions
    .map((id) => actionById(actions, id))
    .filter((action): action is UiAction => action !== undefined);

  return (
    <div className="grid gap-4">
      <p className="font-medium">{t(`${formula}.title` as never)}</p>
      <div className="grid gap-4 @lg:grid-cols-2">
        {props.inputs.map((input) => (
          <Slider
            key={input.name}
            input={input}
            label={t(`${formula}.${input.name}` as never)}
            value={number(input)}
            text={
              MONEY.has(input.name)
                ? money(number(input))
                : String(number(input))
            }
            onChange={(next) =>
              setState((now) => ({ ...now, [input.name]: next }))
            }
          />
        ))}
      </div>
      {result}
      {range &&
      range.count >= 0 &&
      (range.source === "presets" || range.count > 0) ? (
        <p className="t-body-s text-fg-muted">
          {t(
            `${formula}.${range.source === "presets" ? "presets" : "range"}` as never,
            {
              min: money(range.minCents),
              max: money(range.maxCents),
              median: money(range.medianCents),
            } as never,
          )}
        </p>
      ) : null}
      {formula === "ugc_budget" ? (
        <p className="t-body-s text-fg-subtle">{t("ugc_budget.network")}</p>
      ) : null}
      {formula === "freelance_order" ? (
        <p className="t-body-s text-fg-subtle">{t("freelance_order.noFee")}</p>
      ) : null}
      {shownActions.length ? (
        <div className="flex flex-wrap gap-2">
          {shownActions.map((action, index) => (
            <BlockButton
              key={action.id}
              action={action}
              handlers={handlers}
              variant={index === 0 ? "primary" : "secondary"}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Slider({
  input,
  label,
  value,
  text,
  onChange,
}: {
  input: CalcInput;
  label: string;
  value: number;
  text: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="t-body-s text-fg-muted">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-fg">
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={input.min}
        max={input.max}
        step={input.step}
        value={value}
        aria-valuetext={text}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer accent-accent"
      />
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
      <span className="text-fg-muted">{label}</span>
      <span className="font-mono text-2xl text-fg" aria-live="polite">
        {value}
      </span>
    </p>
  );
}

function Cost({
  label,
  value,
  note,
  best,
}: {
  label: string;
  value: string;
  note: string;
  best: boolean;
}) {
  return (
    <div
      className={
        best
          ? "rounded-lg border border-accent px-3 py-2"
          : "rounded-lg border border-line px-3 py-2"
      }
    >
      <dt className="t-body-s text-fg-muted">{label}</dt>
      <dd className="font-mono text-xl text-fg">
        {value}
        <span className="t-body-s ml-1 font-sans text-fg-muted">{note}</span>
      </dd>
    </div>
  );
}
