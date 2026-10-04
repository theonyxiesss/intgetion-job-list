import { getTranslations } from "next-intl/server";
import { ExplainLines } from "./explain-lines";
import { matchForJob } from "../service";

/** «Почему подходит» — only when a signed-in candidate scores at least 0.55. */
export async function WhyItFits({
  userId,
  jobId,
}: {
  userId: string;
  jobId: string;
}) {
  const match = await matchForJob(userId, jobId);
  if (!match) return null;
  const t = await getTranslations("matches");
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-4">
      <h2 className="t-label text-fg-muted">{t("whyTitle")}</h2>
      <p className="t-data text-signal">{`${Math.round(match.score * 100)}%`}</p>
      <ExplainLines entries={match.explain} />
    </section>
  );
}
