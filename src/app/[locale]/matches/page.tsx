import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { navForward } from "@/components/ui/page-transition";
import { LinkTabs } from "@/components/ui/tabs";
import { hasCandidateProfile } from "@/modules/candidates/service";
import { PublicJobCard } from "@/modules/jobs/ui/public-job-card";
import { getMatchFeed, InvalidCursorError } from "@/modules/matching/feed";
import { isMatchTab, type MatchTab } from "@/modules/matching/service";
import { DismissButton } from "@/modules/matching/ui/dismiss-button";
import { MatchExplain } from "@/modules/matching/ui/match-explain";

export const dynamic = "force-dynamic";

const HINT_ANCHOR = {
  salary: "#salary",
  format: "#preferences",
  timezone: "#preferences",
} as const;

function tabHref(tab: MatchTab, cursor?: string) {
  const query = new URLSearchParams();
  if (tab !== "all") query.set("tab", tab);
  if (cursor) query.set("cursor", cursor);
  const text = query.toString();
  return text ? `/matches?${text}` : "/matches";
}

export default async function MatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; cursor?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect({ href: "/login", locale });
    }
    throw error;
  }
  const t = await getTranslations("matches");
  const reasons = await getTranslations("jobActions.reasons");

  if (!(await hasCandidateProfile(user.id))) {
    return (
      <main className="py-10 md:py-16">
        <Container className="flex flex-col gap-8">
          <PageHeader title={t("title")} intro={t("lead")} />
          <EmptyState
            title={t("noProfileTitle")}
            text={t("noProfileText")}
            action={
              <ButtonLink href="/profile/edit" {...navForward}>
                {t("lowDataAction")}
              </ButtonLink>
            }
          />
        </Container>
      </main>
    );
  }

  const tab: MatchTab = isMatchTab(query.tab) ? query.tab : "all";
  const userId = user.id;
  // A broken cursor in the address starts the tab from the first page.
  const feed = await getMatchFeed(userId, {
    tab,
    cursor: query.cursor,
    locale,
  }).catch((error: unknown) => {
    if (!(error instanceof InvalidCursorError)) throw error;
    return getMatchFeed(userId, { tab, locale });
  });

  const dismissText = {
    dismiss: t("dismiss"),
    title: t("dismissTitle"),
    lead: t("dismissLead"),
    reasonLabel: t("reasonLabel"),
    reasonNone: t("reasonNone"),
    confirm: t("confirm"),
    cancel: t("cancel"),
    close: t("close"),
    error: t("dismissError"),
    rateLimited: t("rateLimited"),
    reasons: {
      salary: reasons("salary"),
      format: reasons("format"),
      timezone: reasons("timezone"),
      company: reasons("company"),
      role: reasons("role"),
      other: reasons("other"),
    },
  };
  const fillProfile = (
    <ButtonLink href="/profile/edit" {...navForward}>
      {t("lowDataAction")}
    </ButtonLink>
  );
  const empty =
    tab === "hidden" ? (
      <EmptyState title={t("emptyHidden")} />
    ) : tab === "new" ? (
      <EmptyState title={t("emptyNew")} />
    ) : feed.lowData || feed.counts.all === 0 ? (
      <EmptyState
        title={feed.lowData ? t("lowDataTitle") : t("emptyAll")}
        text={feed.lowData ? t("lowDataText") : t("emptyAllText")}
        action={fillProfile}
      />
    ) : (
      <EmptyState title={t("emptyAll")} text={t("emptyAllText")} />
    );

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} intro={t("lead")} />
        <LinkTabs
          label={t("tabsLabel")}
          indicatorName="match-tabs"
          items={(["all", "new", "hidden"] as const).map((key) => ({
            label: t(`tabs.${key}`),
            href: tabHref(key),
            active: tab === key,
            count: feed.counts[key],
          }))}
        />
        {feed.profileHints.length > 0 && tab !== "hidden" ? (
          <div className="flex flex-col gap-3">
            {feed.profileHints.map((hint) => (
              <Alert key={hint} tone="warning" title={t("hintTitle")}>
                <p>{t(`hints.${hint}`)}</p>
                <ButtonLink
                  href={`/profile/edit${HINT_ANCHOR[hint]}`}
                  variant="ghost"
                  className="mt-1 -ml-5"
                  trailingIcon={<Icon icon={ArrowRight} size={16} />}
                >
                  {t("hintAction")}
                </ButtonLink>
              </Alert>
            ))}
          </div>
        ) : null}
        {feed.lowData && feed.items.length > 0 && tab !== "hidden" ? (
          <Alert tone="info" title={t("lowDataTitle")}>
            {t("lowDataText")}
          </Alert>
        ) : null}
        {feed.items.length === 0 ? (
          empty
        ) : (
          <ul className="grid gap-4">
            {feed.items.map(({ job, score, explain }) => (
              <li key={job.id} className="flex flex-col">
                <PublicJobCard
                  job={job}
                  locale={locale}
                  extraBadges={
                    score === null ? (
                      <Badge>{t("hiddenNote")}</Badge>
                    ) : (
                      <Badge tone="new" className="font-mono">
                        {t("scoreValue", {
                          percent: Math.round(score * 100),
                        })}
                      </Badge>
                    )
                  }
                  actions={
                    score === null ? undefined : (
                      <DismissButton
                        jobId={job.id}
                        jobTitle={job.title}
                        text={dismissText}
                      />
                    )
                  }
                />
                {explain.length > 0 ? (
                  <MatchExplain
                    entries={explain}
                    className="border border-t-0 border-line px-5 py-4 md:px-6"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {feed.nextCursor ? (
          <ButtonLink
            href={tabHref(tab, feed.nextCursor)}
            variant="secondary"
            className="self-start"
          >
            {t("next")}
          </ButtonLink>
        ) : null}
      </Container>
    </main>
  );
}
