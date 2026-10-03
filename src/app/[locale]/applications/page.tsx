import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApplicationList } from "@/components/applications/application-list";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import { hasCandidateProfile } from "@/modules/candidates/service";
import {
  listOwnApplications,
  TERMINAL_APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/modules/applications/service";

const terminal = new Set<ApplicationStatus>(TERMINAL_APPLICATION_STATUSES);

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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
  const groups = new Map<ApplicationStatus, typeof rows>();
  for (const row of rows) {
    const list = groups.get(row.status) ?? [];
    list.push(row);
    groups.set(row.status, list);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      {!profile ? (
        <p>
          {t("needProfile")}{" "}
          <Link href="/profile/edit" className="underline">
            {t("createProfile")}
          </Link>
        </p>
      ) : rows.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        [...groups.entries()].map(([status, items]) => (
          <section key={status} className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">{t(`status.${status}`)}</h2>
            <ApplicationList
              items={items.map((item) => ({
                id: item.id,
                jobTitle: item.jobTitle,
                status: item.status,
                canWithdraw: !terminal.has(item.status),
              }))}
            />
          </section>
        ))
      )}
    </main>
  );
}
