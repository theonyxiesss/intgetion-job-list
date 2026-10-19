import { getTranslations } from "next-intl/server";
import { ListingCard } from "@/components/ui/listing-card";
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

/** One service in the catalog (28.11 C), on the shared card (D479). */
export async function ServiceCard({
  card,
  locale,
}: {
  card: CatalogCard;
  locale: string;
}) {
  const t = await getTranslations("freelance");
  return (
    <ListingCard
      href={`/freelance/${card.slug}`}
      title={card.title}
      headingLevel={2}
      label={t(`categories.${card.category}`)}
      subtitle={<SellerLine card={card} />}
      tags={card.skills}
      tagLimit={3}
      moreTagsLabel={(hidden) => `+${hidden}`}
      lead={
        <p className="t-data-l">
          {t("from", { price: formatUsd(card.fromMinor, locale) })}
        </p>
      }
      trail={
        <p className="flex flex-col items-end gap-1 text-right">
          <span className="t-data text-fg-muted">
            {t("days", { count: card.fromDays })}
          </span>
          <TrackRecord card={card} />
        </p>
      }
      viewLabel={t("viewService")}
    />
  );
}
