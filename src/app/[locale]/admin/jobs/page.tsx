import { getTranslations, setRequestLocale } from "next-intl/server";
import { RemoveJobAction } from "@/components/admin/admin-actions";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { Link } from "@/i18n/navigation";
import {
  listAdminJobs,
  listAdminJobsQuery,
} from "@/modules/moderation/service";

export default async function AdminJobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const raw = await searchParams;
  const query = listAdminJobsQuery.safeParse(raw);
  const { items, nextCursor } = await listAdminJobs(
    query.success ? query.data : listAdminJobsQuery.parse({}),
  );

  return (
    <AdminShell title={t("jobsTitle")}>
      <form className="flex flex-wrap gap-2" role="search">
        <label htmlFor="admin-jobs-q" className="sr-only">
          {t("searchTitle")}
        </label>
        <input
          id="admin-jobs-q"
          name="q"
          defaultValue={raw.q ?? ""}
          placeholder={t("searchTitle")}
          className="min-h-11 rounded-md border border-current/30 bg-transparent px-2"
        />
        <button className="min-h-11 rounded-md border border-current px-3">
          {t("search")}
        </button>
      </form>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th scope="col">{t("colTitle")}</th>
            <th scope="col">{t("colSource")}</th>
            <th scope="col">{t("colStatus")}</th>
            <th scope="col">{t("colRisk")}</th>
            <th scope="col">{t("colActions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((job) => (
            <tr key={job.id} className="border-t border-current/15">
              <td className="py-2">
                {job.title}
                <span className="block text-xs opacity-80">
                  {job.companyName}
                </span>
              </td>
              <td>{job.source}</td>
              <td>{job.status}</td>
              <td>{job.riskScore}</td>
              <td>
                {job.status !== "removed" && <RemoveJobAction jobId={job.id} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {nextCursor && (
        <Link
          href={{
            pathname: "/admin/jobs",
            query: { ...(raw.q ? { q: raw.q } : {}), cursor: nextCursor },
          }}
          className="underline"
        >
          {t("nextPage")}
        </Link>
      )}
    </AdminShell>
  );
}
