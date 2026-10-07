import { Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  ButtonLink,
  Container,
  EmptyState,
  Icon,
  LinkTabs,
  PageHeader,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
  navForward,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listJobsForUser } from "@/modules/jobs/service";
import { localePrefix } from "@/i18n/paths";

/** DESIGN.md 9.0: tabs by status, archive = expired, closed, removed. */
const TABS = {
  published: ["published", "paused"],
  moderation: ["pending_moderation"],
  drafts: ["draft"],
  archive: ["expired", "closed", "removed"],
} as const;
type Tab = keyof typeof TABS;

const date = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : "—";

export default async function EmployerJobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login`);
  const t = await getTranslations("employerJobs");
  const rows = await listJobsForUser(user.id);
  const requested = (await searchParams).tab;
  const tab: Tab =
    requested && requested in TABS ? (requested as Tab) : "published";
  const inTab = (key: Tab) =>
    rows.filter(({ job }) =>
      (TABS[key] as readonly string[]).includes(job.status),
    );
  const shown = inTab(tab);

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <PageHeader
          title={t("title")}
          actions={
            <ButtonLink
              href="/employer/jobs/new"
              {...navForward}
              icon={<Icon icon={Plus} size={16} />}
            >
              {t("newJob")}
            </ButtonLink>
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            title={t("empty")}
            action={
              <ButtonLink href="/employer/jobs/new" variant="secondary">
                {t("newJob")}
              </ButtonLink>
            }
          />
        ) : (
          <>
            <LinkTabs
              label={t("title")}
              items={(Object.keys(TABS) as Tab[]).map((key) => ({
                label: t(`tabs.${key}`),
                href: { pathname: "/employer/jobs", query: { tab: key } },
                active: key === tab,
                count: inTab(key).length,
              }))}
            />
            {shown.length === 0 ? (
              <EmptyState title={t(`tabEmpty.${tab}`)} />
            ) : (
              <Table caption={t("title")}>
                <thead>
                  <tr>
                    <Th>{t("colTitle")}</Th>
                    <Th>{t("status")}</Th>
                    <Th>{t("colPublished")}</Th>
                    <Th>{t("colExpires")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ job }) => (
                    <Tr key={job.id}>
                      <Td>
                        <Link
                          {...navForward}
                          href={`/employer/jobs/${job.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {job.title}
                        </Link>
                      </Td>
                      <Td>
                        <StatusBadge status={job.status}>
                          {t(`statusLabel.${job.status}`)}
                        </StatusBadge>
                      </Td>
                      <Td mono>{date(job.publishedAt)}</Td>
                      <Td mono>{date(job.expiresAt)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </>
        )}
      </Container>
    </main>
  );
}
