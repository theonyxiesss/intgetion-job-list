import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { EmployerStatusActions } from "@/components/applications/employer-status-actions";
import { HttpError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  employerMayOpen,
  employerPatchTargets,
  openApplication,
} from "@/modules/applications/service";
import { getCandidateForViewer } from "@/modules/candidates/service";

export default async function EmployerApplicationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("employerApplications");
  let application;
  try {
    application = await openApplication(user.id, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  if (!(await employerMayOpen(user.id, application.jobId))) notFound();

  let profile = null;
  try {
    profile = await getCandidateForViewer(user.id, application.candidateId);
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 404) throw error;
  }

  const targets = employerPatchTargets(application.status);
  const actions = t.raw("actions") as Record<
    (typeof targets)[number] | "processing" | "error",
    string
  >;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <Link
        className="underline"
        href={`/${locale}/employer/jobs/${application.jobId}/applications`}
      >
        {t("backToList")}
      </Link>
      <h1 className="text-3xl font-semibold">
        {application.candidateName ?? t("unnamed")}
      </h1>
      <p>{application.jobTitle}</p>
      <p>{t(`status.${application.status}`)}</p>
      {application.coverNote ? (
        <section className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{t("coverNote")}</h2>
          <p>{application.coverNote}</p>
        </section>
      ) : null}
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t("profileTitle")}</h2>
        {profile ? (
          <>
            <p>{profile.headline}</p>
            <p>{profile.desiredTitles.join(", ")}</p>
            <ul className="list-disc pl-5">
              {profile.skills.map((skill) => (
                <li key={skill.skillId}>{skill.nameEn}</li>
              ))}
            </ul>
          </>
        ) : (
          <p>{t("noProfile")}</p>
        )}
      </section>
      <EmployerStatusActions
        applicationId={application.id}
        targets={targets}
        text={actions}
      />
    </main>
  );
}
