import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  listMyCampaignSummaries,
  UGC_STEPS,
  ugcPriceGuide,
  usdLabel,
} from "@/modules/ugc/service";
import { StepTrack } from "@/modules/ugc/ui/step-track";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * UGC videos (D464): two doors — a company that needs videos and a creator
 * who makes them — then the company's briefs with their step track.
 */
export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ugc");
  const h = await getTranslations("ugcHub");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const rows = user ? await listMyCampaignSummaries(user.id) : [];
  const guide = await ugcPriceGuide();
  const steps = Object.fromEntries(
    UGC_STEPS.map((step) => [step, h(`steps.${step}`)]),
  ) as Record<(typeof UGC_STEPS)[number], string>;
  const door =
    "flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 md:p-6";

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} intro={t("intro")} />

        <div className="grid gap-4 md:grid-cols-2">
          <section className={door} aria-labelledby="ugc-door-company">
            <h2 id="ugc-door-company" className="t-h3">
              {h("doorCompanyTitle")}
            </h2>
            <p className="t-body-s text-fg-muted">{h("doorCompanyText")}</p>
            <div className="mt-auto flex flex-wrap gap-3">
              <ButtonLink href="/chat?from=campaigns">
                {h("doorCompanyAction")}
              </ButtonLink>
              <ButtonLink
                href={user ? "/campaigns/new" : "/login?next=campaigns"}
                variant="secondary"
              >
                {user ? t("newBrief") : t("signIn")}
              </ButtonLink>
            </div>
          </section>
          <section className={door} aria-labelledby="ugc-door-creator">
            <h2 id="ugc-door-creator" className="t-h3">
              {h("doorCreatorTitle")}
            </h2>
            <p className="t-body-s text-fg-muted">{h("doorCreatorText")}</p>
            <div className="mt-auto flex flex-wrap gap-3">
              <ButtonLink href="/creator/campaigns">
                {h("doorCreatorAction")}
              </ButtonLink>
              <ButtonLink href="/creator" variant="secondary">
                {h("creatorProfile")}
              </ButtonLink>
              <ButtonLink href="/creator/invites" variant="secondary">
                {h("creatorInvites")}
              </ButtonLink>
            </div>
          </section>
        </div>

        <section className="flex flex-col gap-2" aria-labelledby="ugc-price">
          <h2 id="ugc-price" className="t-h3">
            {h("priceTitle")}
          </h2>
          <p className="t-body-s text-fg-muted">
            {guide.source === "briefs"
              ? h("priceRange", {
                  min: usdLabel(guide.minMinor),
                  max: usdLabel(guide.maxMinor),
                  median: usdLabel(guide.medianMinor),
                })
              : h("pricePresets", {
                  list: guide.presets.map(usdLabel).join(", "),
                  usual: usdLabel(guide.medianMinor),
                })}
          </p>
          <p className="t-body-s text-fg-muted">{t("moneyNote")}</p>
        </section>

        {user ? (
          <section className="flex flex-col gap-4" aria-labelledby="ugc-mine">
            <h2 id="ugc-mine" className="t-h3">
              {h("mineTitle")}
            </h2>
            {rows.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-line p-5">
                <p className="font-medium">{h("emptyTitle")}</p>
                <p className="t-body-s text-fg-muted">{h("emptyText")}</p>
                <div className="t-body-s flex flex-col gap-1 rounded-md bg-surface-2 p-4">
                  <p className="t-label text-fg-muted">{h("exampleTitle")}</p>
                  <p>{h("exampleProduct")}</p>
                  <p>{h("exampleVideos")}</p>
                  <p className="font-mono">{h("exampleReward")}</p>
                  <p className="text-fg-muted">{h("exampleRights")}</p>
                </div>
                <ButtonLink href="/chat?from=campaigns" className="self-start">
                  {h("doorCompanyAction")}
                </ButtonLink>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {rows.map((row) => {
                  const next = row.progress.next;
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-3 rounded-lg border border-line p-4 md:p-5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={`/campaigns/${row.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {row.productName}
                        </Link>
                        <span className="t-data text-fg-muted">
                          {h("budget", { total: usdLabel(row.budgetMinor) })}
                        </span>
                      </div>
                      <StepTrack
                        progress={row.progress}
                        labels={steps}
                        label={row.productName}
                      />
                      <p className="t-body-s font-mono text-fg-muted">
                        {row.progress.step === "done"
                          ? h("stepDone")
                          : row.progress.step === "rejected"
                            ? h("stepRejected")
                            : h("counts", {
                                applied: row.progress.counts.applied,
                                hired: row.progress.counts.hired,
                                waiting: row.progress.counts.waiting,
                              })}
                      </p>
                      {next ? (
                        <ButtonLink
                          href={`/campaigns/${row.id}`}
                          className="self-start"
                        >
                          {next === "hire"
                            ? h("nextHire")
                            : next === "decide"
                              ? h("nextDecide")
                              : h("nextRemind")}
                        </ButtonLink>
                      ) : row.progress.step === "responses" ||
                        row.progress.step === "review" ? (
                        <p className="t-body-s text-fg-muted">
                          {h("nextWait")}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </Container>
    </main>
  );
}
