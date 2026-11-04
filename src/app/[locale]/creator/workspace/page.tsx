import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { OrderCard } from "@/components/ui/order-card";
import { Stat, StatRow } from "@/components/ui/stat";
import { RouteMessages } from "@/components/shell/route-messages";
import { intlLocale } from "@/i18n/locale";
import { usdText } from "@/lib/calc";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  getCreatorWorkspace,
  workspaceOrderStage,
  type WorkspaceItem,
  type WorkspaceSection,
} from "@/modules/ugc/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc.workspace" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

const SECTIONS: readonly WorkspaceSection[] = [
  "offers",
  "in_progress",
  "on_review",
  "done",
];

/** The creator's work on one page (TZ 48 §7, U1): now, deadlines, money. */
export default async function CreatorWorkspacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("ugc.workspace");
  const card = await getTranslations("ui.orderCard");
  const stepLabels = {
    accepted: card("steps.accepted"),
    work: card("steps.work"),
    review: card("steps.review"),
    done: card("steps.done"),
  };
  const ws = await getCreatorWorkspace(user.id);
  const dates = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
  });
  const usd = (minor: bigint | null) =>
    minor === null ? t("noReward") : usdText(Number(minor), locale);

  function deadline(item: WorkspaceItem) {
    const date = dates.format(new Date(`${item.deadline}T00:00:00.000Z`));
    if (item.stage === "paid" || item.stage === "closed") return date;
    if (item.daysLeft < 0)
      return t("overdueBy", { date, days: -item.daysLeft });
    if (item.daysLeft === 0) return t("dueToday", { date });
    return t("dueIn", { date, days: item.daysLeft });
  }

  function line(item: WorkspaceItem) {
    return (
      <li key={item.inviteId}>
        <OrderCard
          href={`/chat?invite=${item.inviteId}`}
          icon="ugc"
          code={`UGC / ${item.inviteId.slice(0, 4).toUpperCase()}`}
          status={t(`stage.${item.stage}`)}
          stage={workspaceOrderStage(item.stage)}
          stepLabels={stepLabels}
          stepsLabel={card("stepsLabel")}
          title={item.productName}
          subtitle={t(`hint.${item.stage}`)}
          price={{ label: card("reward"), value: usd(item.rewardMinor) }}
          date={{
            label: card("deadline"),
            value: <time dateTime={item.deadline}>{deadline(item)}</time>,
          }}
          actions={
            <ButtonLink
              href={`/chat?invite=${item.inviteId}`}
              variant={item.action === "none" ? "secondary" : "strong"}
            >
              {t(`action.${item.action}`)}
            </ButtonLink>
          }
        />
      </li>
    );
  }

  const empty = SECTIONS.every((section) => ws.sections[section].length === 0);

  return (
    <RouteMessages namespaces={["ugc"]}>
      <main className="py-10 md:py-16">
        <Container className="flex flex-col gap-10">
          <PageHeader title={t("title")} intro={t("intro")} />
          <StatRow>
            <Stat
              label={t("money.accepted")}
              value={usd(ws.money.acceptedMinor)}
            />
            <Stat label={t("money.owed")} value={usd(ws.money.owedMinor)} />
            <Stat label={t("money.paid")} value={usd(ws.money.paidMinor)} />
          </StatRow>
          <p className="t-body-s -mt-6 text-fg-muted">{t("money.note")}</p>
          {empty ? (
            <section className="flex flex-col gap-3 rounded-lg border border-line p-4 md:p-6">
              <p className="font-medium">{t("empty.title")}</p>
              <p className="text-fg-muted">{t("empty.text")}</p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/creator/campaigns" variant="strong">
                  {t("empty.browse")}
                </ButtonLink>
                <ButtonLink href="/creator" variant="secondary">
                  {t("empty.profile")}
                </ButtonLink>
              </div>
            </section>
          ) : (
            <>
              <section aria-labelledby="ws-now" className="flex flex-col gap-3">
                <h2 id="ws-now" className="t-h3">
                  {t("now")}
                </h2>
                {ws.now.length === 0 ? (
                  <p className="text-fg-muted">{t("nowEmpty")}</p>
                ) : (
                  <ul className="grid gap-4 md:grid-cols-2">
                    {ws.now.map(line)}
                  </ul>
                )}
              </section>
              {SECTIONS.map((section) =>
                ws.sections[section].length === 0 ? null : (
                  <section
                    key={section}
                    aria-labelledby={`ws-${section}`}
                    className="flex flex-col gap-3"
                  >
                    <h2 id={`ws-${section}`} className="t-h3">
                      {t(`section.${section}`)}
                      <span className="t-data ml-2 text-fg-muted">
                        {ws.sections[section].length}
                      </span>
                    </h2>
                    <ul className="grid gap-4 md:grid-cols-2">
                      {ws.sections[section].map(line)}
                    </ul>
                  </section>
                ),
              )}
            </>
          )}
        </Container>
      </main>
    </RouteMessages>
  );
}
