import { getTranslations } from "next-intl/server";
import { type CatalogTag, MARKER_SKILLS } from "@/config/markers";

/**
 * The collection's name in the visitor's language (D300). One source for the
 * page heading, the share picture and the neighbour links, so the three can
 * never drift apart.
 */
export async function tagLabel(
  tag: CatalogTag,
  locale: string,
  slug: string,
): Promise<string> {
  const markers = await getTranslations({ locale, namespace: "markers" });
  const categories = await getTranslations({ locale, namespace: "categories" });
  const jobs = await getTranslations({ locale, namespace: "jobs" });
  if (tag.kind === "sector") return markers(`sectors.${tag.sector}`);
  if (tag.kind === "category") return categories(tag.category);
  if (tag.kind === "seniority") return markers(`seniority.${tag.seniority}`);
  if (tag.kind === "employment") return jobs(tag.employment);
  if (tag.kind === "region") return markers(`regions.${tag.region.slug}`);
  if (tag.kind === "remote") return jobs("remote");
  return skillLabel(slug, locale);
}

/** Marker skills carry their own names; a database-only skill keeps its slug. */
export function skillLabel(slug: string, locale: string): string {
  const skill = MARKER_SKILLS.find((item) => item.slug === slug);
  if (!skill) return slug;
  return locale === "ru" ? skill.nameRu : skill.nameEn;
}
