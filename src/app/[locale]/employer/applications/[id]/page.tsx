import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { EmployerStatusActions } from "@/components/applications/employer-status-actions";
import { ExpressInterestButton } from "@/components/applications/express-interest-button";
import {
  ButtonLink,
  Container,
  EmptyState,
  Icon,
  Stat,
  StatRow,
  StatusBadge,
  Tag,
  navBack,
} from "@/components/ui";
import { HttpError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  contactsOpen,
  employerMayOpen,
  employerPatchTargets,
  expressInterestPlan,
  openApplication,
  readApplicationContacts,
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
  const interest = await getTranslations("expressInterest");
  const contactsText = await getTranslations("contacts");
  const labels = await getTranslations("jobs");
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
  let contacts = null;
  if (contactsOpen(application.status)) {
    try {
      contacts = await readApplicationContacts(user.id, application.id);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 404) throw error;
    }
  }
  const actions = t.raw("actions") as Record<
    (typeof targets)[number] | "processing" | "error",
    string
  >;
  const canExpress =
    expressInterestPlan(application.status, false) === "commit";

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <ButtonLink
          href={`/employer/jobs/${application.jobId}/applications`}
          variant="ghost"
          {...navBack}
          icon={<Icon icon={ArrowLeft} size={16} />}
          className="-ml-5 self-start"
        >
          {t("backToList")}
        </ButtonLink>

        <header className="flex flex-col gap-4 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <p className="t-label text-fg-muted">{application.jobTitle}</p>
            <h1 className="t-display-l">
              {application.candidateName ?? t("unnamed")}
            </h1>
            {profile?.headline && (
              <p className="t-body-l text-fg-muted">{profile.headline}</p>
            )}
            <StatusBadge status={application.status}>
              {t(`status.${application.status}`)}
            </StatusBadge>
          </div>
          <div className="flex flex-wrap gap-3">
            {canExpress && (
              <ExpressInterestButton
                applicationId={application.id}
                label={interest("button")}
                error={interest("error")}
              />
            )}
            <EmployerStatusActions
              applicationId={application.id}
              targets={targets}
              text={actions}
            />
          </div>
        </header>

        {contacts ? (
          <section
            aria-labelledby="contacts-title"
            className="flex flex-col gap-4 border border-success p-6"
          >
            <h2 id="contacts-title" className="t-h3 text-success">
              {contactsText("title")}
            </h2>
            <ul className="t-data flex flex-col gap-2">
              <li>{contacts.email}</li>
              {contacts.phone ? <li>{contacts.phone}</li> : null}
              {contacts.telegram ? <li>{contacts.telegram}</li> : null}
              {contacts.linkedinUrl ? <li>{contacts.linkedinUrl}</li> : null}
              {contacts.websiteUrl ? <li>{contacts.websiteUrl}</li> : null}
            </ul>
          </section>
        ) : null}

        {application.coverNote ? (
          <section
            aria-labelledby="cover-title"
            className="flex flex-col gap-3"
          >
            <h2 id="cover-title" className="t-h3">
              {t("coverNote")}
            </h2>
            <p className="max-w-[68ch] whitespace-pre-wrap">
              {application.coverNote}
            </p>
          </section>
        ) : null}

        <section
          aria-labelledby="profile-title"
          className="flex flex-col gap-6"
        >
          <h2 id="profile-title" className="t-h3">
            {t("profileTitle")}
          </h2>
          {profile ? (
            <>
              <StatRow>
                <Stat
                  label={t("experience")}
                  value={profile.experienceYears ?? "—"}
                  muted={profile.experienceYears === null}
                />
                <Stat label={t("timezone")} value={profile.timezone} />
                <Stat
                  label={t("hours")}
                  value={`${profile.workHoursStart}–${profile.workHoursEnd}`}
                />
                <Stat
                  label={t("formats")}
                  value={
                    profile.workFormats.map((f) => labels(f)).join(" · ") || "—"
                  }
                />
                <Stat
                  label={t("languages")}
                  value={
                    profile.languages
                      .map((l) => `${l.lang} · ${l.level}`)
                      .join(", ") || "—"
                  }
                />
              </StatRow>
              {profile.desiredTitles.length > 0 && (
                <p className="text-fg-muted">
                  {profile.desiredTitles.join(" · ")}
                </p>
              )}
              {profile.skills.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <li key={skill.skillId}>
                      <Tag>{locale === "ru" ? skill.nameRu : skill.nameEn}</Tag>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <EmptyState title={t("noProfile")} />
          )}
        </section>
      </Container>
    </main>
  );
}
