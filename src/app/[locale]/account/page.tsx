import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { RouteMessages } from "@/components/shell/route-messages";
import { logger } from "@/lib/logger";
import { getOwnCandidate } from "@/modules/candidates/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { getSeller, listOwnServices } from "@/modules/freelance/service";
import { listJobsForUser } from "@/modules/jobs/service";
import { getOwnCreatorProfile, listMyCampaigns } from "@/modules/ugc/service";
import { readSharedProfile } from "@/modules/users/service";
import { SharedProfileForm } from "@/modules/users/ui/shared-profile-form";
import { requireSettingsUser } from "../settings/require-settings-user";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** One role's read failing must not take the account page down. */
async function safe<T>(read: Promise<T>, fallback: T): Promise<T> {
  try {
    return await read;
  } catch (error) {
    logger.warn({ err: error }, "account: role read failed");
    return fallback;
  }
}

type Role = {
  key: "candidate" | "employer" | "creator" | "freelancer" | "client";
  on: boolean;
  status: string;
  href: string;
};

/** One account for every service (D504, 29.8): the shared profile and the roles. */
export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("account");
  const [
    shared,
    candidate,
    companies,
    jobs,
    creator,
    seller,
    services,
    campaigns,
  ] = await Promise.all([
    safe(readSharedProfile(user.id), null),
    safe(getOwnCandidate(user.id), null),
    safe(getCompaniesForUser(user.id), []),
    safe(listJobsForUser(user.id), []),
    safe(getOwnCreatorProfile(user.id), null),
    safe(getSeller(user.id), null),
    safe(listOwnServices(user.id), []),
    safe(listMyCampaigns(user.id), []),
  ]);

  const roles: Role[] = [
    {
      key: "candidate",
      on: candidate !== null,
      status: candidate
        ? t("roles.candidate.on", { score: candidate.completeness })
        : t("roles.candidate.off"),
      href: candidate ? "/profile" : "/profile/edit",
    },
    {
      key: "employer",
      on: companies.length > 0,
      status: companies.length
        ? t("roles.employer.on", {
            companies: companies.length,
            jobs: jobs.length,
          })
        : t("roles.employer.off"),
      href: companies.length ? "/employer/jobs" : "/employer/company",
    },
    {
      key: "creator",
      on: creator !== null,
      status: creator
        ? t(`roles.creator.${creator.status === "paused" ? "paused" : "on"}`)
        : t("roles.creator.off"),
      href: "/creator",
    },
    {
      key: "freelancer",
      on: Boolean(seller?.accepting) || services.length > 0,
      status:
        seller?.accepting || services.length
          ? t("roles.freelancer.on", {
              accepting: seller?.accepting ? "true" : "false",
              services: services.length,
            })
          : t("roles.freelancer.off"),
      href: "/profile/freelance",
    },
    {
      key: "client",
      on: campaigns.length > 0,
      status: campaigns.length
        ? t("roles.client.on", { briefs: campaigns.length })
        : t("roles.client.off"),
      href: campaigns.length ? "/campaigns" : "/campaigns/new",
    },
  ];

  return (
    <RouteMessages namespaces={["account"]}>
      <main className="py-10 md:py-16">
        <Container narrow className="flex flex-col gap-10">
          <PageHeader title={t("title")} intro={t("intro")} />
          <section
            aria-labelledby="account-profile"
            className="flex flex-col gap-4 rounded-lg border border-line p-4 md:p-6"
          >
            <div className="flex flex-col gap-1">
              <h2 id="account-profile" className="t-h3">
                {t("profile.title")}
              </h2>
              <p className="t-body-s text-fg-muted">{t("profile.text")}</p>
            </div>
            <SharedProfileForm
              initial={{
                displayName: shared?.displayName ?? null,
                country: shared?.country ?? null,
                city: shared?.city ?? null,
                timezone: shared?.timezone ?? null,
                languages: shared?.languages ?? [],
                about: shared?.about ?? null,
              }}
            />
          </section>
          <section
            aria-labelledby="account-roles"
            className="flex flex-col gap-2"
          >
            <h2 id="account-roles" className="t-h3">
              {t("roles.title")}
            </h2>
            <p className="t-body-s text-fg-muted">{t("roles.text")}</p>
            <ul className="mt-2 flex flex-col border-t border-line">
              {roles.map((role) => (
                <li
                  key={role.key}
                  className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <p className="flex items-center gap-2 font-medium">
                      {t(`roles.${role.key}.name`)}
                      {role.on ? (
                        <Badge tone="success">{t("roles.active")}</Badge>
                      ) : null}
                    </p>
                    <p className="t-body-s text-fg-muted">{role.status}</p>
                  </div>
                  <ButtonLink
                    href={role.href}
                    variant="secondary"
                    className="self-start sm:self-auto"
                  >
                    {role.on ? t("roles.open") : t("roles.start")}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </section>
        </Container>
      </main>
    </RouteMessages>
  );
}
