import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clapperboard, UserRound } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { OrderCard } from "@/components/ui/order-card";
import { Stat, StatRow } from "@/components/ui/stat";
import { RouteMessages } from "@/components/shell/route-messages";
import { flags } from "@/config/flags";
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
import { UgcV2RoleNav } from "@/modules/ugc/ui/v2-role-nav";

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

  if (flags.uiV2Enabled) {
    const ugc = await getTranslations("ugc");
    const hub = await getTranslations("ugcHub");
    const desk = await getTranslations("ugcDesk");
    const offered = ws.sections.offers.filter((item) => item.stage === "offer");
    const campaignRows = [
      ...ws.sections.in_progress,
      ...ws.sections.on_review,
      ...ws.sections.done,
    ];
    const videoRows = [
      ...ws.sections.on_review,
      ...ws.sections.done.filter((item) =>
        ["payout_wait", "paid", "rejected"].includes(item.stage),
      ),
    ];
    const metrics = [
      { label: ugc("invitesTitle"), value: String(offered.length) },
      {
        label: t("section.in_progress"),
        value: String(ws.sections.in_progress.length),
      },
      { label: t("money.owed"), value: usd(ws.money.owedMinor) },
      { label: t("money.paid"), value: usd(ws.money.paidMinor) },
    ];
    const v2Card = "rounded-[18px] border border-line bg-surface p-4";
    const v2Line = (item: WorkspaceItem) => (
      <li
        key={item.inviteId}
        className={`${v2Card} flex flex-wrap items-center gap-4`}
      >
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg-muted"
        >
          <Icon icon={Clapperboard} size={20} />
        </span>
        <span className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="font-semibold break-words">{item.productName}</span>
          <span className="text-sm text-fg-muted">{deadline(item)}</span>
        </span>
        <span className="flex flex-col gap-1 text-sm sm:items-end">
          <span className="font-mono font-semibold">
            {usd(item.rewardMinor)}
          </span>
          <span className="text-fg-muted">{t(`stage.${item.stage}`)}</span>
        </span>
        <ButtonLink href={`/chat?invite=${item.inviteId}`} variant="secondary">
          {t(`action.${item.action}`)}
        </ButtonLink>
      </li>
    );

    return (
      <RouteMessages namespaces={["ugc"]}>
        <main className="py-6 md:py-8">
          <Container className="flex flex-col gap-4">
            <header className="flex flex-wrap items-center gap-3">
              <h1 className="mr-auto text-[22px] font-semibold">
                {ugc("title")}
              </h1>
              <UgcV2RoleNav active="creator" />
              <ButtonLink
                href="/creator"
                variant="secondary"
                icon={<Icon icon={UserRound} size={16} />}
              >
                {ugc("profileTitle")}
              </ButtonLink>
            </header>
            <p className="text-sm text-fg-muted">{ugc("v2.creatorLead")}</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`${v2Card} flex flex-col gap-1`}
                >
                  <span className="text-xs text-fg-muted">{metric.label}</span>
                  <span className="font-mono text-[22px] font-semibold">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-fg-muted">{t("money.note")}</p>
            {!empty ? (
              <nav
                aria-label={t("title")}
                className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1 text-sm"
              >
                <Link
                  href="#ugc-v2-invites"
                  className="flex min-h-10 items-center rounded-lg bg-surface px-3"
                >
                  {ugc("v2.creatorInvites")}
                </Link>
                <Link
                  href="#ugc-v2-work"
                  className="flex min-h-10 items-center rounded-lg px-3 text-fg-muted hover:text-fg"
                >
                  {ugc("v2.creatorCampaigns")}
                </Link>
                <Link
                  href="#ugc-v2-videos"
                  className="flex min-h-10 items-center rounded-lg px-3 text-fg-muted hover:text-fg"
                >
                  {ugc("v2.creatorVideos")}
                </Link>
              </nav>
            ) : null}
            {empty ? (
              <section className={`${v2Card} flex flex-col gap-3`}>
                <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
                <p className="text-sm text-fg-muted">{t("empty.text")}</p>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/creator/campaigns" variant="primary">
                    {t("empty.browse")}
                  </ButtonLink>
                  <ButtonLink href="/creator" variant="secondary">
                    {t("empty.profile")}
                  </ButtonLink>
                </div>
              </section>
            ) : (
              <>
                <section
                  id="ugc-v2-invites"
                  aria-labelledby="ugc-v2-invites-title"
                  className="flex scroll-mt-6 flex-col gap-3"
                >
                  <h2
                    id="ugc-v2-invites-title"
                    className="text-lg font-semibold"
                  >
                    {ugc("v2.creatorInvites")}
                  </h2>
                  {ws.sections.offers.length > 0 ? (
                    <ul className="flex flex-col gap-2.5">
                      {ws.sections.offers.map(v2Line)}
                    </ul>
                  ) : (
                    <p className="text-sm text-fg-muted">
                      {ugc("emptyInvites")}
                    </p>
                  )}
                  <Link
                    href="/creator/invites"
                    className="self-start text-sm text-accent hover:underline"
                  >
                    {hub("creatorInvites")}
                  </Link>
                </section>
                <section
                  id="ugc-v2-work"
                  aria-labelledby="ugc-v2-work-title"
                  className="flex scroll-mt-6 flex-col gap-3"
                >
                  <h2 id="ugc-v2-work-title" className="text-lg font-semibold">
                    {ugc("v2.creatorCampaigns")}
                  </h2>
                  {campaignRows.length > 0 ? (
                    <ul className="flex flex-col gap-2.5">
                      {campaignRows.map(v2Line)}
                    </ul>
                  ) : (
                    <p className="text-sm text-fg-muted">{t("nowEmpty")}</p>
                  )}
                  <Link
                    href="/creator/campaigns"
                    className="self-start text-sm text-accent hover:underline"
                  >
                    {t("empty.browse")}
                  </Link>
                </section>
                <section
                  id="ugc-v2-videos"
                  aria-labelledby="ugc-v2-videos-title"
                  className="flex scroll-mt-6 flex-col gap-3"
                >
                  <h2
                    id="ugc-v2-videos-title"
                    className="text-lg font-semibold"
                  >
                    {ugc("v2.creatorVideos")}
                  </h2>
                  {videoRows.length > 0 ? (
                    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {videoRows.map((item) => (
                        <li
                          key={item.inviteId}
                          className={`${v2Card} flex flex-col gap-3`}
                        >
                          <span
                            aria-hidden="true"
                            className="flex aspect-[9/12] items-center justify-center rounded-xl bg-surface-2 text-fg-muted"
                          >
                            <Icon icon={Clapperboard} size={24} />
                          </span>
                          <span className="font-semibold break-words">
                            {item.productName}
                          </span>
                          <span className="text-sm text-fg-muted">
                            {t(`stage.${item.stage}`)}
                          </span>
                          <Link
                            href={`/chat?invite=${item.inviteId}`}
                            className="mt-auto text-sm text-accent hover:underline"
                          >
                            {t("action.none")}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-fg-muted">
                      {desk("videosEmpty")}
                    </p>
                  )}
                </section>
              </>
            )}
          </Container>
        </main>
      </RouteMessages>
    );
  }

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
                  <ul className="grid gap-4 lg:grid-cols-2">
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
                    <ul className="grid gap-4 lg:grid-cols-2">
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
