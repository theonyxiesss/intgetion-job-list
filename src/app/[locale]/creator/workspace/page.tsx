import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { Stat, StatRow } from "@/components/ui/stat";
import { RouteMessages } from "@/components/shell/route-messages";
import { intlLocale } from "@/i18n/locale";
import { usdText } from "@/lib/calc";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  getCreatorWorkspace,
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
      <li
        key={item.inviteId}
        className="flex flex-col gap-3 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium break-words">{item.productName}</p>
          <p className="t-body-s flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-muted">
            <Badge tone={item.action === "none" ? "neutral" : "new"}>
              {t(`stage.${item.stage}`)}
            </Badge>
            <span className="t-data">{usd(item.rewardMinor)}</span>
            <span className="t-data">{deadline(item)}</span>
          </p>
          <p className="t-body-s text-fg-muted">{t(`hint.${item.stage}`)}</p>
        </div>
        <ButtonLink
          href={`/chat?invite=${item.inviteId}`}
          variant={item.action === "none" ? "secondary" : "strong"}
          className="self-start sm:self-center"
        >
          {t(`action.${item.action}`)}
        </ButtonLink>
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
                  <ul className="flex flex-col gap-3">{ws.now.map(line)}</ul>
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
                    <ul className="flex flex-col gap-3">
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
