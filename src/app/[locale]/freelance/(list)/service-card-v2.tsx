// v2 (UI_V2) catalog card from the freelance mockup: cover, seller, title,
// term, price, a chat shortcut and «Order». The module card stays as it is.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { CatalogCard } from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";

const COVERS = [
  "bg-[linear-gradient(135deg,#1c2a44,#141416)]",
  "bg-[linear-gradient(135deg,#3a2f1c,#141416)]",
  "bg-[linear-gradient(135deg,#1c3a2c,#141416)]",
  "bg-[linear-gradient(135deg,#2e1c3a,#141416)]",
  "bg-[linear-gradient(135deg,#3a1f1c,#141416)]",
];
const AVATARS = [
  "bg-signal",
  "bg-warning",
  "bg-accent",
  "bg-signal",
  "bg-danger",
];

export async function ServiceCardV2({
  card,
  locale,
}: {
  card: CatalogCard;
  locale: string;
}) {
  const t = await getTranslations("freelance");
  const name = card.seller.displayName ?? card.seller.headline ?? t("seller");
  let hash = 0;
  for (const char of card.slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] border border-line bg-surface">
      <div
        aria-hidden="true"
        className={`h-28 ${COVERS[hash % COVERS.length]}`}
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="flex items-center gap-2 text-xs text-fg-muted">
          <span
            aria-hidden="true"
            className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-accent-fg ${AVATARS[hash % AVATARS.length]}`}
          >
            {initials}
          </span>
          <span className="truncate">{name}</span>
          {card.completed > 0 && card.rating !== null ? (
            <span className="text-fg">
              <span aria-hidden="true" className="text-warning">
                ★
              </span>{" "}
              {card.rating.toFixed(1)}
            </span>
          ) : (
            <span className="text-fg-subtle">{t("newSeller")}</span>
          )}
        </p>
        <h2 className="text-[15px] font-semibold">
          <Link href={`/freelance/${card.slug}`} className="hover:underline">
            {card.title}
          </Link>
        </h2>
        <p className="text-xs text-fg-subtle">
          {t("days", { count: card.fromDays })}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-2">
          <span className="mr-auto text-[15px] font-semibold">
            {t("v2.fromPrice", { price: formatUsd(card.fromMinor, locale) })}
          </span>
          <Link
            href={`/chat?service=${card.id}`}
            aria-label={t("v2.askAbout")}
            className="flex size-10 items-center justify-center rounded-xl border border-line-strong text-fg-muted hover:text-fg"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 5h16v11H8l-4 4z" />
            </svg>
          </Link>
          <Link
            href={`/freelance/${card.slug}`}
            className="flex min-h-10 items-center rounded-xl bg-fg px-4 text-sm font-semibold text-bg hover:opacity-90"
          >
            {t("v2.order")}
          </Link>
        </div>
      </div>
    </article>
  );
}
