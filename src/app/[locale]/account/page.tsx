import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountSignIn } from "@/components/settings/account-sign-in";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { RouteMessages } from "@/components/shell/route-messages";
import { PRICING } from "@/config/pricing";
import { logger } from "@/lib/logger";
import {
  billingForCompany,
  billingMe,
  type BillingMe,
  type CompanyBilling,
} from "@/modules/billing/service";
import { AccountWallet } from "@/modules/billing/ui/account-wallet";
import { getOwnCandidate } from "@/modules/candidates/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { getSeller, listOwnServices } from "@/modules/freelance/service";
import { listJobsForUser } from "@/modules/jobs/service";
import { getOwnCreatorProfile, listMyCampaigns } from "@/modules/ugc/service";
import {
  readAccountWallet,
  readSharedProfile,
  walletChangeImpact,
} from "@/modules/users/service";
import { SharedProfileForm } from "@/modules/users/ui/shared-profile-form";
import { requireSettingsUser } from "../settings/require-settings-user";
import { flags } from "@/config/flags";
import { Link } from "@/i18n/navigation";
import {
  getSellerRecord,
  listPublicReviews,
} from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";

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

/** One service's read failing must not take the account page down. */
async function safe<T>(read: Promise<T>, fallback: T): Promise<T> {
  try {
    return await read;
  } catch (error) {
    logger.warn({ err: error }, "account: service read failed");
    return fallback;
  }
}

type Service = {
  key: "jobs" | "hiring" | "videos" | "creator" | "freelance";
  status: string;
  href: string;
};

const FREE_BILLING: BillingMe = {
  plan: "start",
  candidatePlan: "free",
  crypto: false,
  hires: [],
  teamUntil: null,
  candidateUntil: null,
};

function day(iso: string | null, locale: string): string | null {
  return iso
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        new Date(iso),
      )
    : null;
}

/**
 * One account for every service (D504, D517): about me, the plans in
 * force, every service of the site without "roles", sign-in and the wallet.
 * Rights stay where they live (company membership, plan); the page only
 * shows them.
 */
export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("account");
  const pricing = await getTranslations("pricing");
  const [
    shared,
    candidate,
    companies,
    jobs,
    creator,
    seller,
    services,
    campaigns,
    billing,
    wallet,
    impact,
  ] = await Promise.all([
    safe(readSharedProfile(user.id), null),
    safe(getOwnCandidate(user.id), null),
    safe(getCompaniesForUser(user.id), []),
    safe(listJobsForUser(user.id), []),
    safe(getOwnCreatorProfile(user.id), null),
    safe(getSeller(user.id), null),
    safe(listOwnServices(user.id), []),
    safe(listMyCampaigns(user.id), []),
    safe(billingMe(user.id), FREE_BILLING),
    safe(readAccountWallet(user.id), null),
    safe(walletChangeImpact(user.id), null),
  ]);
  const companyBillings = await Promise.all(
    companies.map(async (company) => ({
      company,
      billing: await safe<CompanyBilling>(
        billingForCompany(user.id, company.id),
        { plan: "start", hires: [], teamUntil: null },
      ),
    })),
  );

  const list: Service[] = [
    {
      key: "jobs",
      status: candidate
        ? t("services.jobs.on", { score: candidate.completeness })
        : t("services.jobs.off"),
      href: "/profile/edit",
    },
    {
      key: "hiring",
      status: companies.length
        ? t("services.hiring.on", {
            companies: companies.length,
            jobs: jobs.length,
          })
        : t("services.hiring.off"),
      href: companies.length ? "/employer/jobs" : "/post-job",
    },
    {
      key: "videos",
      status: campaigns.length
        ? t("services.videos.on", { briefs: campaigns.length })
        : t("services.videos.off"),
      href: campaigns.length ? "/campaigns" : "/campaigns/new",
    },
    {
      key: "creator",
      status: creator
        ? t(`services.creator.${creator.status === "paused" ? "paused" : "on"}`)
        : t("services.creator.off"),
      href: "/creator",
    },
    {
      key: "freelance",
      status:
        seller?.accepting || services.length
          ? t("services.freelance.on", {
              accepting: seller?.accepting ? "true" : "false",
              services: services.length,
            })
          : t("services.freelance.off"),
      href: "/profile/freelance",
    },
  ];

  const personal = PRICING.candidates.find(
    (tier) => tier.code === billing.candidatePlan,
  )!;
  const plans = [
    {
      key: "personal",
      label: t("plan.personal", {
        name: pricing(`tiers.${personal.code}.name`),
      }),
      name: pricing(`tiers.${personal.code}.name`),
      until: day(billing.candidateUntil, locale),
      points: personal.points.map((point) =>
        pricing(`tiers.${personal.code}.points.${point}`),
      ),
    },
    // The company plan belongs to the company; shown to its members.
    ...companyBillings.map(({ company, billing: companyBilling }) => {
      const tier = PRICING.companies.find(
        (item) => item.code === companyBilling.plan,
      )!;
      return {
        key: `company-${company.id}`,
        label: t("plan.company", {
          company: company.name,
          name: pricing(`tiers.${tier.code}.name`),
        }),
        name: pricing(`tiers.${tier.code}.name`),
        until:
          companyBilling.plan === "team"
            ? day(companyBilling.teamUntil, locale)
            : null,
        points: tier.points.map((point) =>
          pricing(`tiers.${tier.code}.points.${point}`),
        ),
      };
    }),
  ];

  const section =
    "flex flex-col gap-4 rounded-lg border border-line p-4 md:p-6";

  // v2 (UI_V2): the profile mockup on the same data and forms.
  if (flags.uiV2Enabled) {
    const card = "rounded-[18px] border border-line bg-surface p-5";
    // Freelance side of the same account (mockup: rating, services, reviews).
    const ownServices = await safe(listOwnServices(user.id), []);
    const published = ownServices.filter((item) => item.status === "published");
    const record = await safe(getSellerRecord(user.id), null);
    const reviews = (
      await Promise.all(
        published
          .slice(0, 5)
          .map((item) =>
            safe(listPublicReviews(item.id, 3), []).then((rows) =>
              rows.map((row) => ({ ...row, service: item.title })),
            ),
          ),
      )
    )
      .flat()
      .filter((row) => row.body)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 3);
    const rating = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const name = shared?.displayName?.trim() || t("title");
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    const place = [shared?.city, shared?.country, shared?.timezone]
      .filter(Boolean)
      .join(" · ");
    const completeness = candidate?.completeness ?? null;
    return (
      <RouteMessages namespaces={["account", "settings"]}>
        <main className="px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-start gap-5">
            <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
              <section
                aria-labelledby="account-title"
                className={`${card} flex flex-wrap items-center gap-5`}
              >
                <span
                  aria-hidden="true"
                  className="flex size-[76px] shrink-0 items-center justify-center rounded-full bg-signal text-2xl font-bold text-signal-fg"
                >
                  {initials}
                </span>
                <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
                  <h1
                    id="account-title"
                    className="text-2xl font-semibold tracking-tight"
                  >
                    {name}
                  </h1>
                  {place ? (
                    <p className="text-sm text-fg-muted">{place}</p>
                  ) : null}
                  {record?.rating != null && record.ratingCount > 0 ? (
                    <p className="text-sm">
                      <span aria-hidden="true" className="text-warning">
                        ★{" "}
                      </span>
                      {t("v2.rating", {
                        rating: rating.format(record.rating),
                        count: record.ratingCount,
                      })}
                    </p>
                  ) : null}
                  <p className="text-sm text-fg-muted">{t("intro")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="#account-profile-section"
                    className="flex min-h-11 items-center rounded-xl border border-line-strong px-4 text-sm"
                  >
                    {t("profile.title")}
                  </a>
                  <Link
                    href="/profile/edit"
                    className="flex min-h-11 items-center rounded-xl bg-fg px-4 text-sm font-medium text-bg"
                  >
                    {t("services.jobs.name")}
                  </Link>
                </div>
              </section>

              <section
                aria-labelledby="account-services"
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <h2 id="account-services" className="text-lg font-semibold">
                    {t("services.title")}
                  </h2>
                  <p className="text-sm text-fg-muted">{t("services.text")}</p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {list.map((service) => (
                    <li key={service.key}>
                      <Link
                        href={service.href}
                        className={`${card} flex h-full flex-col gap-2 hover:border-line-strong`}
                      >
                        <span className="font-semibold">
                          {t(`services.${service.key}.name`)}
                        </span>
                        <span className="text-sm text-fg-muted">
                          {service.status}
                        </span>
                        <span className="mt-auto pt-1 text-sm text-accent">
                          {t("services.open")} →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                aria-labelledby="account-own-services"
                className={`${card} flex flex-col gap-3`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id="account-own-services"
                    className="text-lg font-semibold"
                  >
                    {t("v2.myServices")}
                  </h2>
                  <Link
                    href="/profile/freelance/new"
                    className="flex min-h-10 items-center rounded-xl border border-line-strong px-3.5 text-sm"
                  >
                    {t("v2.addService")}
                  </Link>
                </div>
                {ownServices.length === 0 ? (
                  <p className="text-sm text-fg-muted">{t("v2.noServices")}</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {ownServices.slice(0, 4).map((item) => {
                      const prices = item.packages.map(
                        (pack) => pack.priceMinor,
                      );
                      const from = prices.length
                        ? prices.reduce((a, b) => (b < a ? b : a))
                        : null;
                      return (
                        <li key={item.id}>
                          <Link
                            href={
                              item.status === "published"
                                ? `/freelance/${item.slug}`
                                : "/profile/freelance"
                            }
                            className="flex h-full flex-col gap-1.5 rounded-[14px] border border-line bg-surface-2 p-4 hover:border-line-strong"
                          >
                            <span className="text-[15px] font-medium">
                              {item.title}
                            </span>
                            <span className="text-sm text-fg-muted">
                              {from !== null
                                ? t("v2.priceFrom", {
                                    price: formatUsd(from, locale),
                                  })
                                : null}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link
                  href="/profile/freelance"
                  className="self-start text-sm text-accent"
                >
                  {t("services.open")} →
                </Link>
              </section>

              {reviews.length > 0 ? (
                <section
                  aria-labelledby="account-reviews"
                  className={`${card} flex flex-col gap-3`}
                >
                  <h2 id="account-reviews" className="text-lg font-semibold">
                    {t("v2.reviews")}
                  </h2>
                  <ul className="flex flex-col">
                    {reviews.map((review, index) => (
                      <li
                        key={index}
                        className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0 first:pt-0"
                      >
                        <span className="text-sm">
                          <span aria-hidden="true" className="text-warning">
                            {"★".repeat(review.rating)}
                          </span>
                          <span className="sr-only">{review.rating}/5</span>
                          <span className="text-fg-subtle">
                            {" "}
                            · {review.service}
                          </span>
                        </span>
                        <p className="text-sm text-fg-muted">{review.body}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section
                id="account-profile-section"
                aria-labelledby="account-profile"
                className={`${card} flex scroll-mt-6 flex-col gap-4`}
              >
                <div className="flex flex-col gap-1">
                  <h2 id="account-profile" className="text-lg font-semibold">
                    {t("profile.title")}
                  </h2>
                  <p className="text-sm text-fg-muted">{t("profile.text")}</p>
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
            </div>

            <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:max-w-[380px]">
              {completeness !== null ? (
                <section className={`${card} flex flex-col gap-3`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[15px] font-semibold">
                      {t("services.jobs.name")}
                    </h2>
                    <span className="text-2xl font-semibold text-accent">
                      {completeness}%
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className="flex h-1.5 rounded-full bg-surface-2"
                  >
                    <span
                      className="rounded-full bg-accent"
                      style={{ width: `${completeness}%` }}
                    />
                  </span>
                  <Link href="/profile/edit" className="text-sm text-accent">
                    {t("services.open")} →
                  </Link>
                </section>
              ) : null}

              <section
                aria-labelledby="account-plan"
                className={`${card} flex flex-col gap-3`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 id="account-plan" className="text-[15px] font-semibold">
                    {t("plan.title")}
                  </h2>
                  <Link href="/pricing" className="text-sm text-accent">
                    {t("plan.change")}
                  </Link>
                </div>
                <ul className="flex flex-col gap-3">
                  {plans.map((plan) => (
                    <li key={plan.key} className="flex flex-col gap-1.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">
                          {plan.name}
                        </span>
                        <span className="text-sm">{plan.label}</span>
                      </span>
                      {plan.until ? (
                        <span className="text-xs text-fg-subtle">
                          {t("plan.until", { date: plan.until })}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>

              <section
                id="security"
                aria-labelledby="account-security"
                className={`${card} flex scroll-mt-6 flex-col gap-4`}
              >
                <div className="flex flex-col gap-1">
                  <h2
                    id="account-security"
                    className="text-[15px] font-semibold"
                  >
                    {t("security.title")}
                  </h2>
                  <p className="text-sm text-fg-muted">{t("security.text")}</p>
                </div>
                <AccountSignIn locale={locale} user={user} />
                <AccountWallet
                  address={wallet?.address ?? null}
                  projectId={
                    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ??
                    ""
                  }
                  blocked={impact?.blocked ?? false}
                  openPayments={impact?.openPayments ?? 0}
                  unpaidOrders={impact?.unpaidOrders ?? 0}
                  owedRewards={impact?.owedRewards ?? 0}
                />
                <Link href="/settings/account" className="text-sm text-accent">
                  {t("security.more")} →
                </Link>
              </section>
            </aside>
          </div>
        </main>
      </RouteMessages>
    );
  }

  return (
    <RouteMessages namespaces={["account", "settings"]}>
      <main className="py-10 md:py-16">
        <Container narrow className="flex flex-col gap-10">
          <PageHeader title={t("title")} intro={t("intro")} />

          <section aria-labelledby="account-profile" className={section}>
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

          <section aria-labelledby="account-plan" className={section}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="account-plan" className="t-h3">
                  {t("plan.title")}
                </h2>
                <p className="t-body-s text-fg-muted">{t("plan.text")}</p>
              </div>
              <ButtonLink href="/pricing" variant="secondary">
                {t("plan.change")}
              </ButtonLink>
            </div>
            <ul className="flex flex-col border-t border-line">
              {plans.map((plan) => (
                <li
                  key={plan.key}
                  className="flex flex-col gap-2 border-b border-line py-4"
                >
                  <p className="font-medium">
                    {plan.label}
                    {plan.until ? (
                      <span className="t-body-s font-mono text-fg-muted">
                        {" · "}
                        {t("plan.until", { date: plan.until })}
                      </span>
                    ) : null}
                  </p>
                  <ul className="t-body-s flex list-disc flex-col gap-1 pl-5 text-fg-muted">
                    {plan.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="account-services"
            className="flex flex-col gap-2"
          >
            <h2 id="account-services" className="t-h3">
              {t("services.title")}
            </h2>
            <p className="t-body-s text-fg-muted">{t("services.text")}</p>
            <ul className="mt-2 flex flex-col border-t border-line">
              {list.map((service) => (
                <li
                  key={service.key}
                  className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">
                      {t(`services.${service.key}.name`)}
                    </p>
                    <p className="t-body-s text-fg-muted">{service.status}</p>
                  </div>
                  <ButtonLink
                    href={service.href}
                    variant="secondary"
                    className="self-start sm:self-auto"
                  >
                    {t("services.open")}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </section>

          <section
            id="security"
            aria-labelledby="account-security"
            className="flex scroll-mt-24 flex-col gap-6"
          >
            <div className="flex flex-col gap-1">
              <h2 id="account-security" className="t-h3">
                {t("security.title")}
              </h2>
              <p className="t-body-s text-fg-muted">{t("security.text")}</p>
            </div>
            <AccountSignIn locale={locale} user={user} />
            <AccountWallet
              address={wallet?.address ?? null}
              projectId={
                process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? ""
              }
              blocked={impact?.blocked ?? false}
              openPayments={impact?.openPayments ?? 0}
              unpaidOrders={impact?.unpaidOrders ?? 0}
              owedRewards={impact?.owedRewards ?? 0}
            />
            <ButtonLink
              href="/settings/account"
              variant="ghost"
              className="self-start"
            >
              {t("security.more")}
            </ButtonLink>
          </section>
        </Container>
      </main>
    </RouteMessages>
  );
}
