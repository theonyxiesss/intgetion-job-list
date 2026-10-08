import { Check } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { navForward } from "@/components/ui/page-transition";
import {
  ALWAYS_FREE,
  freePlanHref,
  hirePlanHref,
  PRICING,
  PRICING_FAQ,
  type PricingAudience,
} from "@/config/pricing";
import { Link } from "@/i18n/navigation";
import { cn } from "@/components/ui/cn";
import { getViewer, pricingAudienceFor } from "@/lib/viewer";
import { JsonLd } from "@/modules/seo/json-ld";
import { faqPageJsonLd } from "@/modules/seo/markup";
import { languageAlternates, siteUrl } from "@/modules/seo/site";
import { localePrefix } from "@/i18n/paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/pricing`,
      languages: languageAlternates("/pricing"),
    },
  };
}

/**
 * /pricing (docs/PRICING_UX.md, section 2). Hire is the only card that
 * takes money (D357). Team, Plus and Pro stay closed.
 */
export default async function PricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ for?: string; next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const query = await searchParams;
  // D334: a signed-in user sees only their own plans; a guest can switch.
  // D347: posting a job opens the company plans first.
  const viewer = await getViewer();
  const posting = query.next === "post";
  const audience: PricingAudience = pricingAudienceFor(
    viewer.kind,
    query.for,
    query.next,
  );
  const paymentsOn =
    process.env.BILLING_ENABLED === "true" &&
    process.env.BILLING_CRYPTO_PROVIDER === "walletconnect" &&
    Boolean(process.env.COMPANY_WALLET_ADDRESS?.trim());
  const tiers = PRICING[audience];
  const faq = PRICING_FAQ.map((key) => ({
    question: t(`faq.${key}.q`),
    answer: t(`faq.${key}.a`),
  }));

  return (
    <main>
      <JsonLd data={faqPageJsonLd(faq)} />
      <Section>
        <Container className="flex flex-col gap-6">
          <p className="t-label text-fg-muted">{t("label")}</p>
          <h1 className="t-display-l max-w-[22ch]">{t("title")}</h1>
          <p className="t-body-l max-w-[60ch] text-fg-muted">{t("intro")}</p>
          {viewer.kind === "guest" && !posting ? (
            <nav aria-label={t("switchLabel")} className="flex flex-wrap gap-2">
              {(["candidates", "companies"] as const).map((key) => (
                <Link
                  key={key}
                  href={`/pricing?for=${key}`}
                  aria-current={key === audience ? "page" : undefined}
                  className={cn(
                    "t-label flex min-h-11 items-center border px-4",
                    key === audience
                      ? "border-line-strong bg-surface-2 text-fg"
                      : "border-line text-fg-muted hover:text-fg",
                  )}
                >
                  {t(`for.${key}`)}
                </Link>
              ))}
            </nav>
          ) : null}
        </Container>
      </Section>

      <Section bordered labelledBy="tiers-title">
        <Container className="flex flex-col gap-8">
          <h2 id="tiers-title" className="sr-only">
            {t(`for.${audience}`)}
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => (
              <li
                key={tier.code}
                className={cn(
                  "flex flex-col gap-5 border bg-surface p-6",
                  tier.recommended
                    ? "border-line-strong max-md:order-first"
                    : "border-line",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="t-h3">{t(`tiers.${tier.code}.name`)}</h3>
                  {tier.recommended && (
                    <span className="t-label text-signal">
                      {t("recommended")}
                    </span>
                  )}
                </div>
                <p className="t-body-s text-fg-muted">
                  {t(`tiers.${tier.code}.for`)}
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="t-data-l">
                    {tier.price === null ? t("free") : `$${tier.price}`}
                  </span>
                  {tier.per && (
                    <span className="t-body-s text-fg-muted">
                      {t(`per.${tier.per}`)}
                    </span>
                  )}
                </p>
                {tier.yearly !== undefined && (
                  <p className="t-body-s text-fg-muted">
                    {t("yearly", { price: tier.yearly })}
                  </p>
                )}
                <ul className="flex flex-col gap-3">
                  {tier.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <Icon
                        icon={Check}
                        size={16}
                        className="mt-1 shrink-0 text-success"
                      />
                      <span>{t(`tiers.${tier.code}.points.${point}`)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  {tier.price === null ? (
                    <Link
                      href={freePlanHref(audience, query.next)}
                      {...navForward}
                      className={buttonClass("secondary", "md", "w-full")}
                    >
                      {posting && audience === "companies"
                        ? t("continueFree")
                        : t("startFree")}
                    </Link>
                  ) : hirePlanHref(paymentsOn && tier.code === "hire") ? (
                    <Link
                      href="/billing/crypto"
                      {...navForward}
                      className={buttonClass("primary", "md", "w-full")}
                    >
                      {t("payHire")}
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className={buttonClass(
                        "primary",
                        "md",
                        "w-full opacity-60",
                      )}
                    >
                      {t("soon")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="t-body-s text-fg-muted">
            {paymentsOn ? t("hireNote") : t("soonNote")}
          </p>
          {audience === "companies" && (
            <p className="t-body-s text-fg-muted">{t("market")}</p>
          )}
        </Container>
      </Section>

      <Section labelledBy="free-title">
        <Container className="flex flex-col gap-8">
          <h2 id="free-title" className="t-h2">
            {t("alwaysFreeTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ALWAYS_FREE.map((key) => (
              <li key={key} className="border border-line p-5">
                {t(`alwaysFree.${key}`)}
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section bordered labelledBy="faq-title">
        <Container className="flex flex-col gap-8">
          <h2 id="faq-title" className="t-h2">
            {t("faqTitle")}
          </h2>
          <div className="flex flex-col border-t border-line">
            {faq.map((item) => (
              <details
                key={item.question}
                className="group border-b border-line"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="t-data text-fg-muted transition-transform duration-[120ms] group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-4 text-fg-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </Section>
    </main>
  );
}
