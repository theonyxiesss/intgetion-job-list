import { getTranslations } from "next-intl/server";
import { cn } from "@/components/ui/cn";
import type { ExplainEntry } from "../service";
import { MatchExplain } from "./match-explain";

/** "Why it fits" on a job page (DESIGN 9.3, 6B): score and full explain. */
export async function WhyItFits({
  score,
  explain,
  className,
}: {
  score: number;
  explain: readonly ExplainEntry[];
  className?: string;
}) {
  const t = await getTranslations("matches");
  return (
    <section
      aria-labelledby="why-it-fits"
      className={cn("flex-col gap-4 border border-line p-5", className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="why-it-fits" className="t-h3">
          {t("whyTitle")}
        </h2>
        <p className="t-data-l text-signal">
          <span className="sr-only">{t("score")}: </span>
          {`${Math.round(score * 100)}%`}
        </p>
      </div>
      <MatchExplain entries={explain} limit={6} />
    </section>
  );
}
