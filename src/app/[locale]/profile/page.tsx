import { getTranslations, setRequestLocale } from "next-intl/server";
import { SENIORITY_LEVELS, type Seniority } from "@/config/markers";
import { HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { formatMoneyDto } from "@/lib/money";
import { getOwnCandidate } from "@/modules/candidates/service";
import type { CompletenessPart } from "@/modules/candidates/service";
import { getOwnContacts } from "@/modules/contacts/service";
import { Link, redirect } from "@/i18n/navigation";
import { AccountSignIn } from "@/components/settings/account-sign-in";
import { Tag } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { navForward } from "@/components/ui/page-transition";
import { Stat, StatRow } from "@/components/ui/stat";
import { intlLocale } from "@/i18n/locale";

const segments = Array.from({ length: 20 }, (_, index) => index);

const hintAnchor: Record<CompletenessPart, string> = {
  full_name: "basics",
  headline: "basics",
  desired_titles: "basics",
  timezone: "preferences",
  work_schedule: "preferences",
  skills: "skills",
  experience_years: "experience",
  languages: "languages",
  salary: "salary",
  work_preferences: "preferences",
  contact_email: "contacts",
};

function isSeniority(value: string | null): value is Seniority {
  return (
    value !== null && (SENIORITY_LEVELS as readonly string[]).includes(value)
  );
}

export default async function ProfilePage({
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

  const t = await getTranslations("profile");
  const markers = await getTranslations("markers");
  const profile = await getOwnCandidate(user.id);
  const contacts = profile ? await getOwnContacts(user.id) : null;
  const score = profile?.completeness ?? 0;
  const filled = Math.round(score / 5);
  const place = profile
    ? [profile.city, profile.country].filter(Boolean).join(", ")
    : "";
  const seniorityValue = profile?.preferences.seniority ?? null;
  const seniority = isSeniority(seniorityValue) ? seniorityValue : null;
  const money = intlLocale(locale);
  const salary = profile?.salaryMin
    ? `${formatMoneyDto(profile.salaryMin, money)}${
        profile.salaryMax
          ? ` – ${formatMoneyDto(profile.salaryMax, money)}`
          : ""
      } / ${t(`periods.${profile.salaryMin.period}`)} (${t(`basis.${profile.salaryMin.basis}`)})`
    : null;

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-10">
        <PageHeader
          title={profile?.fullName || t("title")}
          intro={profile?.headline ?? undefined}
          actions={
            <Link
              href="/profile/edit"
              {...navForward}
              className={buttonClass("primary")}
            >
              {profile ? t("edit") : t("create")}
            </Link>
          }
        />
        {!profile ? (
          <p>
            {t("empty")}{" "}
            <Link href="/profile/edit" {...navForward} className="underline">
              {t("create")}
            </Link>
          </p>
        ) : (
          <>
            <p className="t-body-s text-fg-muted">
              {t(`jobSearch.${profile.jobSearchStatus}`)}
            </p>
            <p className="t-body-s">
              <Link
                href="/profile/freelance"
                {...navForward}
                className="underline underline-offset-4"
              >
                {(await getTranslations("freelance"))("profileLink")}
              </Link>
            </p>
            {profile.desiredTitles.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {profile.desiredTitles.map((title) => (
                  <li key={title}>
                    <Tag>{title}</Tag>
                  </li>
                ))}
              </ul>
            ) : null}
            <section id="completeness" className="flex flex-col gap-3">
              <h2 className="t-h3">{t("completenessLabel")}</h2>
              <div
                role="progressbar"
                aria-label={t("completenessLabel")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score}
                className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1"
              >
                {segments.map((index) => (
                  <span
                    key={index}
                    className={
                      index < filled ? "h-0.5 bg-accent" : "h-0.5 bg-line"
                    }
                  />
                ))}
              </div>
              <p className="t-data">{t("completenessValue", { score })}</p>
            </section>
            {profile.missing.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="t-h3">{t("missingTitle")}</h2>
                <ul className="flex flex-col gap-2">
                  {profile.missing.map((part) => (
                    <li key={part}>
                      <Link
                        href={`/profile/edit#${hintAnchor[part]}`}
                        {...navForward}
                        className="t-body-s text-fg underline-offset-4 hover:underline"
                      >
                        {t(`missing.${part}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <StatRow>
              {place ? (
                <Stat
                  label={profile.city ? t("fields.city") : t("fields.country")}
                  value={place}
                />
              ) : null}
              {seniority ? (
                <Stat
                  label={t("fields.seniority")}
                  value={markers(`seniority.${seniority}`)}
                />
              ) : null}
              {profile.employmentTypes.length > 0 ? (
                <Stat
                  label={t("fields.employmentTypes")}
                  value={profile.employmentTypes
                    .map((kind) => t(`employment.${kind}`))
                    .join(" · ")}
                />
              ) : null}
              {profile.experienceYears !== null ? (
                <Stat
                  label={t("fields.experienceYears")}
                  value={String(profile.experienceYears)}
                />
              ) : null}
              <Stat label={t("fields.timezone")} value={profile.timezone} />
              <Stat
                label={t("fields.workHoursStart")}
                value={`${profile.workHoursStart}–${profile.workHoursEnd}`}
              />
              {profile.workFormats.length > 0 ? (
                <Stat
                  label={t("fields.workFormats")}
                  value={profile.workFormats
                    .map((format) => t(`formats.${format}`))
                    .join(" · ")}
                />
              ) : null}
              {salary ? <Stat label={t("toc.salary")} value={salary} /> : null}
            </StatRow>
            {profile.experience.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="t-h3">{t("toc.experience")}</h2>
                <ul className="flex flex-col gap-3">
                  {profile.experience.map((item) => (
                    <li key={item.id} className="flex flex-col gap-1">
                      <p>
                        {item.title} · {item.companyName}
                      </p>
                      <p className="t-data text-fg-muted">
                        {item.endMonth
                          ? `${item.startMonth} – ${item.endMonth}`
                          : item.startMonth}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {profile.skills.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="t-h3">{t("fields.skills")}</h2>
                <ul className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <li key={skill.skillId}>
                      <Tag>
                        {`${locale === "ru" ? skill.nameRu : skill.nameEn} · ${t(`levels.${skill.level}`)}`}
                      </Tag>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {profile.languages.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="t-h3">{t("fields.language")}</h2>
                <ul className="flex flex-wrap gap-4">
                  {profile.languages.map((language) => (
                    <li key={language.lang} className="t-data">
                      {`${language.lang} · ${t(`cefr.${language.level}`)}`}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section
              id="contacts"
              className="flex flex-col gap-2 border border-line p-4"
            >
              <h2 className="t-h3">{t("contactsTitle")}</h2>
              <p className="text-fg-muted">{t("contactsHint")}</p>
              {contacts ? (
                <p className="t-data">{contacts.email}</p>
              ) : (
                <p>{t("noContacts")}</p>
              )}
            </section>
          </>
        )}
        <AccountSignIn locale={locale} user={user} />
      </Container>
    </main>
  );
}
