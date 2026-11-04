import { SectionsSkeleton } from "@/components/ui";

/** Shown the moment a link is clicked, while the page renders (D595). */
export default function Loading() {
  return <SectionsSkeleton sections={2} />;
}
