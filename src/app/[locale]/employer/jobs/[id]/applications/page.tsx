import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import {
  ButtonLink,
  Container,
  EmptyState,
  Icon,
  LinkTabs,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
  navBack,
  navForward,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { HttpError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  APPLICATION_STATUSES,
  listEmployerApplications,
  type ApplicationStatus,
} from "@/modules/applications/service";
import { EmployerJobTabs } from "../job-tabs";
import { localePrefix } from "@/i18n/paths";
import { flags } from "@/config/flags";

/** DESIGN.md 9.0: application status tabs; «All» first. */
const STATUS_TABS = ["all", ...APPLICATION_STATUSES] as const;

function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export default async function EmployerApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    cursor?: string | string[];
    status?: string | string[];
  }>;
}) {
  const { locale, id } = await params;
  const { cursor, status: requested } = await searchParams;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login`);

  const t = await getTranslations("employerApplications");
  const jobsT = await getTranslations("employerJobs");
  const status =
    typeof requested === "string" && isApplicationStatus(requested)
      ? requested
      : "all";
  let page;
  try {
    page = await listEmployerApplications(user.id, {
      jobId: id,
      cursor: typeof cursor === "string" ? cursor : undefined,
      limit: 50,
      status: status === "all" ? undefined : status,
    });
  } catch (error) {
    if (
      error instanceof HttpError &&
      (error.status === 404 || error.status === 400)
    ) {
      notFound();
    }
    throw error;
  }

  const count = (key: (typeof STATUS_TABS)[number]) => page.counts[key];
  const jobTitle = page.jobTitle;

  // v2 (UI_V2): the hiring mockup — applications as a board by stage.
  if (flags.uiV2Enabled && status === "all") {
    const stages = APPLICATION_STATUSES.filter(
      (key) => key !== "withdrawn" && key !== "rejected",
    );
    const initials = (name: string | null) =>
      (name ?? "?")
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
    const tones = [
      "bg-[#8ab4ff]",
      "bg-[#f2c46b]",
      "bg-[#7ee0b5]",
      "bg-[#c4a6ff]",
      "bg-[#ff9f8a]",
    ];
    return (
      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
          <header className="flex flex-wrap items-center gap-3">
            <h1 className="mr-auto text-[22px] font-semibold tracking-tight">
              {t("v2.title")}
            </h1>
            <Link
              href={`/employer/jobs/${id}`}
              {...navBack}
              className="flex min-h-10 items-center rounded-xl border border-line-strong px-3.5 text-sm hover:bg-surface"
            >
              {t("back")}
            </Link>
          </header>
          <EmployerJobTabs jobId={id} active="applications" />
          <p className="text-sm text-fg-muted">
            {t("v2.job")}{" "}
            <span className="font-medium text-fg">{jobTitle}</span>
            {" · "}
            {t("v2.count", { count: page.counts.all })}
          </p>
          {page.counts.all === 0 ? (
            <EmptyState title={t("empty")} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              {stages.map((key) => {
                const items = page.items.filter((item) => item.status === key);
                return (
                  <section
                    key={key}
                    aria-label={t(`status.${key}`)}
                    className="flex min-w-0 flex-col gap-2 rounded-[18px] border border-line bg-surface p-3"
                  >
                    <h2 className="flex items-center justify-between px-1 text-sm font-semibold">
                      {t(`status.${key}`)}
                      <span className="text-xs font-normal text-fg-subtle">
                        {count(key)}
                      </span>
                    </h2>
                    <ul className="flex flex-col gap-2">
                      {items.map((item, index) => (
                        <li key={item.id}>
                          <Link
                            {...navForward}
                            href={`/employer/applications/${item.id}`}
                            className="flex flex-col gap-1.5 rounded-xl border border-line bg-bg p-3 hover:border-line-strong"
                          >
                            <span className="flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-accent-fg ${tones[index % tones.length]}`}
                              >
                                {initials(item.candidateName)}
                              </span>
                              <span className="truncate text-sm font-semibold">
                                {item.candidateName ?? t("unnamed")}
                              </span>
                            </span>
                            <span className="text-xs text-fg-subtle">
                              {item.createdAt.slice(0, 10)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
          {page.nextCursor ? (
            <Link
              href={{
                pathname: `/employer/jobs/${id}/applications`,
                query: { cursor: page.nextCursor },
              }}
              className="self-start text-sm text-fg-muted hover:text-fg"
            >
              {t("next")}
            </Link>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <ButtonLink
          href={`/employer/jobs/${id}`}
          variant="ghost"
          {...navBack}
          icon={<Icon icon={ArrowLeft} size={16} />}
          className="-ml-5 self-start"
        >
          {t("back")}
        </ButtonLink>
        <header className="flex flex-col gap-3">
          {jobTitle && <p className="t-label text-fg-muted">{jobTitle}</p>}
          <h1 className="t-display-l">{t("title")}</h1>
        </header>
        <EmployerJobTabs jobId={id} active="applications" />
        {page.counts.all === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <>
            <LinkTabs
              label={jobsT("status")}
              indicatorName="application-status-tab"
              items={STATUS_TABS.map((key) => ({
                label: key === "all" ? t("all") : t(`status.${key}`),
                href: {
                  pathname: `/employer/jobs/${id}/applications`,
                  query: key === "all" ? {} : { status: key },
                },
                active: key === status,
                count: count(key),
              }))}
            />
            {page.items.length === 0 ? (
              <EmptyState
                title={status === "all" ? t("empty") : t("emptyStatus")}
              />
            ) : (
              <Table caption={t("title")}>
                <thead>
                  <tr>
                    <Th>{t("candidate")}</Th>
                    <Th>{jobsT("status")}</Th>
                    <Th>{t("appliedAt")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((item) => (
                    <Tr key={item.id}>
                      <Td>
                        <Link
                          {...navForward}
                          href={`/employer/applications/${item.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {item.candidateName ?? t("unnamed")}
                        </Link>
                      </Td>
                      <Td>
                        <StatusBadge status={item.status}>
                          {t(`status.${item.status}`)}
                        </StatusBadge>
                      </Td>
                      <Td mono>{item.createdAt.slice(0, 10)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </>
        )}
        {page.nextCursor ? (
          <Link
            href={{
              pathname: `/employer/jobs/${id}/applications`,
              query: {
                cursor: page.nextCursor,
                ...(status === "all" ? {} : { status }),
              },
            }}
            className="t-nav inline-flex min-h-11 items-center self-start text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            {t("next")}
          </Link>
        ) : null}
      </Container>
    </main>
  );
}
