import { CatalogSkeleton } from "@/components/ui";

/**
 * Shown the moment a link is clicked, while the list renders. Only the
 * list page sits in this group, so detail pages keep real 404s (D595).
 */
export default function Loading() {
  return <CatalogSkeleton />;
}
