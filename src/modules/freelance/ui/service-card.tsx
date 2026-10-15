import { getTranslations } from "next-intl/server";
import { Tag } from "@/components/ui/badge";
import { navForward } from "@/components/ui/page-transition";
import { Link } from "@/i18n/navigation";
import type { CatalogCard } from "../service";
import { formatUsd, utcLabel } from "./format";

/** Who sells it: short name and zone, or the headline when there is no name. */
export async function SellerLine({ card }: { card: CatalogCard }) {
  const t = await getTranslations("freelance");
  const name = card.seller.displayName ?? card.seller.headline ?? t("seller");
  return (
    <p className="t-body-s flex min-w-0 flex-wrap items-center gap-x-2 text-fg-muted">
      <span className="truncate">{name}</span>
      <span aria-hidden="true">·</span>
      <span className="t-data">{utcLabel(card.seller.timezone)}</span>
    </p>
  );
}

/** Completed services, named as services, and the average rating, or "new" (28.5). */
export async function TrackRecord({ card }: { card: CatalogCard }) {
  const t = await getTranslations("freelance");
  if (card.completed === 0) {
    return <span className="t-body-s text-fg-muted">{t("newSeller")}</span>;
  }
  return (
    <span className="t-body-s text-fg-muted">
      {card.rating !== null ? (
        <span className="t-data text-fg">
          {t("rating", { rating: card.rating.toFixed(1) })}
        </span>
      ) : null}{" "}
      {t("completed", { count: card.completed })}
    </span>
  );
}

/** One service in the catalog (28.11 C). The title links to its page. */
export async function ServiceCard({
  card,
  locale,
}: {
  card: CatalogCard;
  locale: string;
}) {
  const t = await getTranslations("freelance");
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong md:p-6">
      <SellerLine card={card} />
      <h2 className="t-h3">
        <Link
          href={`/freelance/${card.slug}`}
          {...navForward}
          className="underline-offset-4 hover:underline"
        >
          {card.title}
        </Link>
      </h2>
      <ul className="flex flex-wrap gap-2" aria-label={t("skills")}>
        <li>
          <Tag>{t(`categories.${card.category}`)}</Tag>
        </li>
        {card.skills.slice(0, 3).map((skill) => (
          <li key={skill}>
            <Tag>{skill}</Tag>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-3">
        <p className="t-data-l">
          {t("from", { price: formatUsd(card.fromMinor, locale) })}
        </p>
        <p className="flex flex-col items-end gap-1 text-right">
          <span className="t-data text-fg-muted">
            {t("days", { count: card.fromDays })}
          </span>
          <TrackRecord card={card} />
        </p>
      </div>
    </article>
  );
}
