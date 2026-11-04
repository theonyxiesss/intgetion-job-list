import { ServiceIconBox } from "@/components/ui/service-icon";
import { getTranslations } from "next-intl/server";
import { ListingCard } from "@/components/ui/listing-card";
import { ServiceIcon } from "@/components/ui/service-icon";
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

/**
 * One service in the catalog (28.11 C), on the shared card (D479), with the
 * service mark and labelled price and term from the D602 mockup (D605).
 */
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
      mark={<ServiceIconBox name="freelance" />}
      label={t(`categories.${card.category}`)}
      art={<ServiceIcon name="freelance" size={40} className="text-fg" />}
      subtitle={<SellerLine card={card} />}
      tags={card.skills}
      tagLimit={3}
      moreTagsLabel={(hidden) => `+${hidden}`}
      lead={
        <p className="flex flex-col gap-1.5">
          <span className="t-label text-fg-muted">{t("fromLabel")}</span>
          <span className="font-mono text-2xl tracking-tight tabular-nums">
            {formatUsd(card.fromMinor, locale)}
          </span>
        </p>
      }
      trail={
        <p className="flex flex-col items-end gap-1.5 text-right">
          <span className="t-label text-fg-muted">{t("termLabel")}</span>
          <span className="t-data">{t("days", { count: card.fromDays })}</span>
          <TrackRecord card={card} />
        </p>
      }
      viewLabel={t("viewService")}
    />
  );
}
