import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listSavedJobsForUser } from "@/modules/feedback/service";
import { UnsaveButton } from "@/modules/feedback/ui/unsave-button";
import Link from "next/link";

// Personal page of the signed-in user.
export const dynamic = "force-dynamic";

export default async function SavedJobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("savedJobs");
  const entries = await listSavedJobsForUser(user.id);
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      {entries.length ? (
        <ul className="grid gap-3">
          {entries.map(({ job, savedAt }) => (
            <li
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border p-4"
            >
              <div className="flex flex-col">
                <Link
                  className="font-semibold underline"
                  href={`/${locale}/jobs/${job.id}`}
                >
                  {job.title}
                </Link>
                <span className="text-sm">
                  {job.company.name} · {t("savedOn")}{" "}
                  {new Date(savedAt).toLocaleDateString(
                    locale === "ru" ? "ru-RU" : "en-US",
                  )}
                </span>
              </div>
              <UnsaveButton
                jobId={job.id}
                label={t("unsave")}
                error={t("unsaveError")}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("empty")}</p>
      )}
    </main>
  );
}
