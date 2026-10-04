import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Container, PageHeader } from "@/components/ui/container";
import { navForward } from "@/components/ui/page-transition";
import { LinkTabs } from "@/components/ui/tabs";
import { hasCandidateProfile } from "@/modules/candidates/service";
import {
  MATCH_PAGE_DEFAULT,
  loadMatchScreen,
  parseMatchTab,
  profileHintAnchor,
} from "@/modules/matching/service";
import { MatchCardView } from "@/modules/matching/ui/match-card";

export const dynamic = "force-dynamic";

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
  const profile = await hasCandidateProfile(user.id);
  const tab = parseMatchTab(query.tab);
  const screen = profile
    ? await loadMatchScreen(user.id, {
        tab,
        cursor: query.cursor,
        limit: MATCH_PAGE_DEFAULT,
        locale,
      })
    : null;
  const dismiss = {
    dismiss: t("dismiss"),
    title: t("dismissTitle"),
    confirm: t("dismissConfirm"),
    cancel: t("dismissCancel"),
    close: t("dismissClose"),
    error: t("dismissError"),
    reasons: {
      salary: t("reasons.salary"),
      format: t("reasons.format"),
      timezone: t("reasons.timezone"),
      company: t("reasons.company"),
      role: t("reasons.role"),
      other: t("reasons.other"),
    },
  };
  const hrefFor = (next: string) =>
    next === "all"
      ? "/matches"
      : { pathname: "/matches" as const, query: { tab: next } };

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        {!profile || !screen ? (
          <EmptyState
            title={t("emptyProfileTitle")}
            text={t("emptyProfileText")}
            action={
              <Link
                href="/profile/edit"
                {...navForward}
                className="t-nav text-fg"
              >
                {t("emptyProfileAction")}
              </Link>
            }
          />
        ) : (
          <>
            {screen.profileHints.length > 0 ? (
              <Alert tone="warning" title={t("hintTitle")}>
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  {screen.profileHints.map((field) => (
                    <Link
                      key={field}
                      href={`/profile/edit#${profileHintAnchor(field)}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {t(`hints.${field}`)}
                    </Link>
                  ))}
                </span>
              </Alert>
            ) : null}
            <LinkTabs
              label={t("tabsLabel")}
              indicatorName="match-tabs"
              items={[
                {
                  label: t("tabAll"),
                  href: hrefFor("all"),
                  active: tab === "all",
                  count: screen.counts.all,
                },
                {
                  label: t("tabNew"),
                  href: hrefFor("new"),
                  active: tab === "new",
                  count: screen.counts.new,
                },
                {
                  label: t("tabHidden"),
                  href: hrefFor("hidden"),
                  active: tab === "hidden",
                  count: screen.counts.hidden,
                },
              ]}
            />
            {screen.lowData && tab === "all" && screen.counts.all === 0 ? (
              <EmptyState
                title={t("emptyProfileTitle")}
                text={t("emptyProfileText")}
                action={
                  <Link
                    href="/profile/edit"
                    {...navForward}
                    className="t-nav text-fg"
                  >
                    {t("emptyProfileAction")}
                  </Link>
                }
              />
            ) : screen.items.length === 0 ? (
              <EmptyState title={t(`empty.${tab}`)} />
            ) : (
              <div className="flex flex-col gap-4">
                {screen.items.map((card) => (
                  <MatchCardView
                    key={card.job.id}
                    card={card}
                    locale={locale}
                    dismiss={dismiss}
                    isNew={card.isNew}
                  />
                ))}
              </div>
            )}
            {screen.nextCursor ? (
              <Link
                href={{
                  pathname: "/matches",
                  query: {
                    ...(tab === "all" ? {} : { tab }),
                    cursor: screen.nextCursor,
                  },
                }}
                className="t-nav self-start text-fg-muted"
              >
                {t("more")}
              </Link>
            ) : null}
          </>
        )}
      </Container>
    </main>
  );
}
