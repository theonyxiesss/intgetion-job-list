import { getTranslations } from "next-intl/server";
import {
  QUICK_FILTER_VISIBLE,
  QUICK_FILTERS,
  type CatalogTag,
} from "@/config/markers";
import { Link } from "@/i18n/navigation";

function chipClass(active: boolean) {
  return active
    ? "t-label shrink-0 border border-line-strong bg-surface-2 px-3 py-2 text-fg"
    : "t-label shrink-0 border border-line px-3 py-2 text-fg-muted";
}

/** Two rows of tag links, then «Show more». «For you» is first and is not a filter. */
export async function QuickFilters({
  signedIn,
  activeSlug,
}: {
  signedIn: boolean;
  activeSlug?: string;
}) {
  const markers = await getTranslations("markers");
  const categories = await getTranslations("categories");
  const jobs = await getTranslations("jobs");
  const hidden = Math.max(0, QUICK_FILTERS.length - QUICK_FILTER_VISIBLE);

  function label(tag: CatalogTag): string {
    switch (tag.kind) {
      case "for-you":
        return markers("forYou");
      case "remote":
        return jobs("remote");
      case "non-technical":
        return markers("nonTechnical");
      case "high-paying":
        return markers("highPayTitle");
      case "sector":
        return markers(`sectors.${tag.sector}`);
      case "category":
        return categories(tag.category);
      case "seniority":
        return markers(`seniority.${tag.seniority}`);
      case "employment":
        return jobs(tag.employment);
      case "skill":
        return tag.skillSlug;
    }
  }

  return (
    <details className="group flex flex-col gap-3">
      <div className="order-1 flex gap-2 overflow-x-auto md:max-h-[4.75rem] md:flex-wrap md:overflow-hidden group-open:md:max-h-none">
        {QUICK_FILTERS.map((tag) => {
          const href =
            tag.kind === "for-you"
              ? signedIn
                ? "/matches"
                : "/login"
              : `/jobs/t/${tag.slug}`;
          const active = tag.slug === activeSlug;
          return (
            <Link
              key={tag.slug}
              href={active ? "/jobs" : href}
              aria-current={active ? "page" : undefined}
              className={chipClass(active)}
            >
              {label(tag)}
            </Link>
          );
        })}
      </div>
      {hidden > 0 ? (
        <summary className="t-label order-2 w-fit cursor-pointer text-fg-muted">
          {markers("showMore", { count: hidden })}
        </summary>
      ) : null}
    </details>
  );
}
