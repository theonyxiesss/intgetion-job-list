import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApplicationList } from "@/components/applications/application-list";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { navForward } from "@/components/ui/page-transition";
import { hasCandidateProfile } from "@/modules/candidates/service";
import {
  listOwnApplications,
  TERMINAL_APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/modules/applications/service";

const terminal = new Set<ApplicationStatus>(TERMINAL_APPLICATION_STATUSES);
const progress = new Set<ApplicationStatus>(["interview", "offer"]);

function bucket(status: ApplicationStatus) {
  if (terminal.has(status)) return "archive";
  if (progress.has(status)) return "progress";
  return "active";
}

export default async function ApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale } = await params;
  const { view } = await searchParams;
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

  const t = await getTranslations("applications");
  const profile = await hasCandidateProfile(user.id);
  const rows = profile ? await listOwnApplications(user.id) : [];
  const selected = view === "progress" || view === "archive" ? view : "active";
  const visible = rows.filter((row) => bucket(row.status) === selected);

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        {!profile ? (
          <p>
            {t("needProfile")}{" "}
            <Link href="/profile/edit" {...navForward} className="underline">
              {t("createProfile")}
            </Link>
          </p>
        ) : (
          <>
            <LinkTabs
              label={t("tabsLabel")}
              indicatorName="application-tabs"
              items={[
                {
                  label: t("tabActive"),
                  href: "/applications",
                  active: selected === "active",
                  count: rows.filter((row) => bucket(row.status) === "active")
                    .length,
                },
                {
                  label: t("tabProgress"),
                  href: "/applications?view=progress",
                  active: selected === "progress",
                  count: rows.filter((row) => bucket(row.status) === "progress")
                    .length,
                },
                {
                  label: t("tabArchive"),
                  href: "/applications?view=archive",
                  active: selected === "archive",
                  count: rows.filter((row) => bucket(row.status) === "archive")
                    .length,
                },
              ]}
            />
            {visible.length === 0 ? (
              <EmptyState title={t("empty")} />
            ) : (
              <ApplicationList
                items={visible.map((item) => ({
                  id: item.id,
                  jobTitle: item.jobTitle,
                  status: item.status,
                  canWithdraw: !terminal.has(item.status),
                }))}
              />
            )}
          </>
        )}
      </Container>
    </main>
  );
}
