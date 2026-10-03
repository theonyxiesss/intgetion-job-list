import { getTranslations, setRequestLocale } from "next-intl/server";
import { HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { getOwnCandidate } from "@/modules/candidates/service";
import { getOwnContacts } from "@/modules/contacts/service";
import { Link, redirect } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { navForward } from "@/components/ui/page-transition";
import { Stat, StatRow } from "@/components/ui/stat";

const segments = Array.from({ length: 20 }, (_, index) => index);

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
  const profile = await getOwnCandidate(user.id);
  const contacts = profile ? await getOwnContacts(user.id) : null;
  const score = profile?.completeness ?? 0;
  const filled = Math.round(score / 5);

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-10">
        <PageHeader
          title={t("title")}
          actions={
            profile ? (
              <Link
                href="/profile/edit"
                {...navForward}
                className={buttonClass("secondary")}
              >
                {t("edit")}
              </Link>
            ) : null
          }
        />
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
                className={index < filled ? "h-0.5 bg-accent" : "h-0.5 bg-line"}
              />
            ))}
          </div>
          <p className="t-data">{t("completenessValue", { score })}</p>
        </section>

        {!profile ? (
          <p>
            {t("empty")}{" "}
            <Link href="/profile/edit" {...navForward} className="underline">
              {t("create")}
            </Link>
          </p>
        ) : (
          <>
            <StatRow>
              {profile.fullName ? (
                <Stat label={t("fields.fullName")} value={profile.fullName} />
              ) : null}
              {profile.headline ? (
                <Stat label={t("fields.headline")} value={profile.headline} />
              ) : null}
              <Stat label={t("fields.timezone")} value={profile.timezone} />
            </StatRow>
            {profile.missing.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="t-h3">{t("missingTitle")}</h2>
                <ul className="flex flex-col gap-2">
                  {profile.missing.map((part) => (
                    <li key={part} className="border-l border-line-strong pl-3">
                      {t(`missing.${part}`)}
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
      </Container>
    </main>
  );
}
