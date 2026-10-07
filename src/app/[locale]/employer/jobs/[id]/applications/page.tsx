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
import { listEmployerApplications } from "@/modules/applications/service";
import { EmployerJobTabs } from "../job-tabs";
import { localePrefix } from "@/i18n/paths";

/** DESIGN.md 9.0: application status tabs; «All» first. */
const STATUS_TABS = [
  "all",
  "applied",
  "viewed",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
] as const;

export default async function EmployerApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ cursor?: string; status?: string }>;
}) {
  const { locale, id } = await params;
  const { cursor, status: requested } = await searchParams;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login`);

  const t = await getTranslations("employerApplications");
  const jobsT = await getTranslations("employerJobs");
  let page;
  try {
    page = await listEmployerApplications(user.id, {
      jobId: id,
      cursor,
      limit: 50,
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

  const status = (STATUS_TABS as readonly string[]).includes(requested ?? "")
    ? (requested as (typeof STATUS_TABS)[number])
    : "all";
  const count = (key: (typeof STATUS_TABS)[number]) =>
    key === "all"
      ? page.items.length
      : page.items.filter((item) => item.status === key).length;
  const shown =
    status === "all"
      ? page.items
      : page.items.filter((item) => item.status === status);
  const jobTitle = page.items[0]?.jobTitle;

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
        {page.items.length === 0 ? (
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
            {shown.length === 0 ? (
              <EmptyState title={t("emptyStatus")} />
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
                  {shown.map((item) => (
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
              query: { cursor: page.nextCursor },
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
