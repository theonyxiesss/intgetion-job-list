import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { HttpError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listEmployerApplications } from "@/modules/applications/service";

export default async function EmployerApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { locale, id } = await params;
  const { cursor } = await searchParams;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("employerApplications");
  let page;
  try {
    page = await listEmployerApplications(user.id, { jobId: id, cursor });
  } catch (error) {
    if (
      error instanceof HttpError &&
      (error.status === 404 || error.status === 400)
    ) {
      notFound();
    }
    throw error;
  }

  const groups = new Map<string, typeof page.items>();
  for (const item of page.items) {
    const list = groups.get(item.status) ?? [];
    list.push(item);
    groups.set(item.status, list);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <Link className="underline" href={`/${locale}/employer/jobs/${id}`}>
        {t("back")}
      </Link>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      {page.items.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        [...groups.entries()].map(([status, items]) => (
          <section key={status} className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">{t(`status.${status}`)}</h2>
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-1 border border-current/20 p-4"
              >
                <Link
                  className="text-lg font-semibold underline"
                  href={`/${locale}/employer/applications/${item.id}`}
                >
                  {item.candidateName ?? t("unnamed")}
                </Link>
                <p>{item.jobTitle}</p>
              </article>
            ))}
          </section>
        ))
      )}
      {page.nextCursor ? (
        <Link
          className="underline"
          href={`/${locale}/employer/jobs/${id}/applications?cursor=${page.nextCursor}`}
        >
          {t("next")}
        </Link>
      ) : null}
    </main>
  );
}
