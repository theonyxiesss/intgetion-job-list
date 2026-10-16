"use client";

import { createContext, useContext } from "react";
import {
  cardText,
  FREELANCE_CARD_TOOLS,
  type FreelanceCardCopy,
} from "./freelance-copy";

export { cardText, FREELANCE_CARD_TOOLS, type FreelanceCardCopy };
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatUsd } from "@/modules/freelance/ui/format";

export const FreelanceCopyContext = createContext<FreelanceCardCopy>({});

function useCardText() {
  const copy = useContext(FreelanceCopyContext);
  return (key: string, vars?: Record<string, string | number>) =>
    cardText(copy, key, vars);
}

export function isFreelanceCardTool(tool: string): boolean {
  return (FREELANCE_CARD_TOOLS as readonly string[]).includes(tool);
}

type Args = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function usdFromTyped(value: unknown, locale: string): string {
  const raw = text(value);
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(raw)) return raw;
  const [whole, cents = ""] = raw.split(".");
  return formatUsd(
    BigInt(whole ?? "0") * BigInt(100) + BigInt(cents.padEnd(2, "0") || "0"),
    locale,
  );
}

/**
 * What the card will do, from the stored arguments. Plain text only: the
 * arguments came from the model and are shown, never run as markup.
 */
export function FreelanceCardSummary({
  tool,
  args,
}: {
  tool: string;
  args: unknown;
}) {
  const t = useCardText();
  const locale = useLocale();
  const a = (args ?? {}) as Args;
  const lines: string[] = [t(`${tool}.text`)];
  if (tool === "propose_service" || tool === "propose_service_update") {
    if (a.title) lines.push(text(a.title));
    const packages = Array.isArray(a.packages) ? (a.packages as Args[]) : [];
    for (const pkg of packages) {
      lines.push(
        t("package", {
          tier: text(pkg.tier),
          price: usdFromTyped(pkg.price, locale),
          days: Number(pkg.deliveryDays) || 0,
        }),
      );
    }
  }
  if (tool === "send_service_request") {
    lines.push(t("tier", { tier: text(a.tier) }));
    if (a.task) lines.push(text(a.task));
  }
  if (tool === "propose_freelancer_mode") {
    lines.push(a.accepting ? t("modeOn") : t("modeOff"));
  }
  if (tool === "respond_to_request") {
    lines.push(a.answer === "accept" ? t("answerAccept") : t("answerDecline"));
  }
  if (tool === "review_delivery") {
    lines.push(
      a.decision === "accept" ? t("decisionAccept") : t("decisionRevision"),
    );
  }
  if (tool === "propose_review") {
    lines.push(t("rating", { rating: Number(a.rating) || 0 }));
    if (a.body) lines.push(text(a.body));
  }
  if (tool === "report_freelance" && a.details) lines.push(text(a.details));
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, index) => (
        <p key={index} className="whitespace-pre-wrap break-words">
          {line}
        </p>
      ))}
    </div>
  );
}

/** Inputs the person fills in; the value goes to the server, not the model. */
export function FreelanceCardFields({
  id,
  fields,
  values,
  onChange,
}: {
  id: string;
  fields: readonly string[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  const t = useCardText();
  return (
    <div className="flex flex-col gap-3">
      {fields.includes("links") && (
        <label className="flex flex-col gap-1">
          <span className="t-label text-fg">{t("linksLabel")}</span>
          <textarea
            id={`${id}-links`}
            rows={3}
            maxLength={2600}
            value={values.links ?? ""}
            onChange={(event) => onChange("links", event.target.value)}
            className="rounded-md border border-line-strong bg-bg px-3 py-2 text-fg"
          />
          <span className="t-body-s text-fg-subtle">{t("linksHint")}</span>
        </label>
      )}
      {fields.includes("deliveryUrl") && (
        <label className="flex flex-col gap-1">
          <span className="t-label text-fg">{t("deliveryLabel")}</span>
          <input
            id={`${id}-delivery`}
            type="url"
            inputMode="url"
            required
            maxLength={500}
            value={values.deliveryUrl ?? ""}
            onChange={(event) => onChange("deliveryUrl", event.target.value)}
            className="min-h-11 rounded-md border border-line-strong bg-bg px-3 text-fg"
          />
        </label>
      )}
    </div>
  );
}

export type FreelanceServiceCard = {
  id: string;
  slug: string;
  title: string;
  fromMinor: string;
  fromDays: number;
};

/** Services Spoki found: links to their pages on this site only. */
export function FreelanceServiceList({
  services,
}: {
  services: FreelanceServiceCard[];
}) {
  const t = useCardText();
  const locale = useLocale();
  return (
    <ul className="grid gap-2">
      {services.map((service) => (
        <li
          key={service.id}
          className="rounded-2xl border border-line bg-surface-2 px-4 py-3"
        >
          <Link
            href={`/freelance/${encodeURIComponent(service.slug)}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {service.title}
          </Link>
          <p className="t-body-s text-fg-muted">
            {t("from", {
              price: /^\d+$/.test(service.fromMinor)
                ? formatUsd(BigInt(service.fromMinor), locale)
                : "",
              days: service.fromDays,
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** A link card to a page of the freelance cabinet. */
export function FreelanceLinkCard({
  href,
  kind,
}: {
  href: string;
  kind: "order" | "cabinet" | "ugcCampaign";
}) {
  const t = useCardText();
  return (
    <div className="flex max-w-md flex-col items-start gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <p className="font-medium">{t(`${kind}Title`)}</p>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-bg"
      >
        {t(`${kind}Action`)}
      </Link>
    </div>
  );
}
