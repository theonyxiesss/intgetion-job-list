import { Check } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { navForward } from "@/components/ui/page-transition";
import {
  ACCOUNT_PLANS,
  ALWAYS_FREE,
  COMMISSION,
  freePlanHref,
  ONE_OFFS,
  planPayHref,
  PRICING_FAQ,
} from "@/config/pricing";
import { Link } from "@/i18n/navigation";
import { cn } from "@/components/ui/cn";
import { getViewer } from "@/lib/viewer";
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
 * /pricing (docs/PRICING_UX.md, section 2; D587): one set of plans per
 * account, one-off purchases and the deal commission (D586). A guest who
 * clicks pay goes to login. A signed-in user opens checkout (D358).
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
  // D347: posting a job continues to the job form from the free card.
  const viewer = await getViewer();
  const posting = query.next === "post";
  const signedIn = viewer.kind !== "guest";
  const paymentsOn =
    process.env.BILLING_ENABLED === "true" &&
    process.env.BILLING_CRYPTO_PROVIDER === "walletconnect" &&
    Boolean(process.env.COMPANY_WALLET_ADDRESS?.trim());
  const faq = PRICING_FAQ.map((key) => ({
    question: t(`faq.${key}.q`),
    answer: t(`faq.${key}.a`),
  }));
  const plans = ["free", "plus", "pro", "team"] as const;

  return (
    <main>
      <JsonLd data={faqPageJsonLd(faq)} />
      <Section>
        <Container className="flex flex-col gap-6">
          <p className="t-label text-fg-muted">{t("label")}</p>
          <h1 className="t-display-l max-w-[22ch]">{t("account.title")}</h1>
          <p className="t-body-l max-w-[60ch] text-fg-muted">
            {t("account.intro")}
          </p>
        </Container>
      </Section>

      <Section bordered labelledBy="tiers-title">
        <Container className="flex flex-col gap-8">
          <h2 id="tiers-title" className="sr-only">
            {t("account.plansTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {ACCOUNT_PLANS.map((tier) => {
              const payHref = planPayHref(paymentsOn, tier.code, signedIn);
              return (
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
                    <h3 className="t-h3">
                      {t(`account.tiers.${tier.code}.name`)}
                    </h3>
                    {tier.recommended && (
                      <span className="t-label text-signal">
                        {t("recommended")}
                      </span>
                    )}
                  </div>
                  <p className="t-body-s text-fg-muted">
                    {t(`account.tiers.${tier.code}.for`)}
                  </p>
                  <p className="flex flex-wrap items-baseline gap-2">
                    <span className="t-data-l break-words">
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
                        <span>
                          {t(`account.tiers.${tier.code}.points.${point}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    {tier.price === null ? (
                      <Link
                        href={
                          posting
                            ? freePlanHref("companies", query.next)
                            : signedIn
                              ? "/jobs"
                              : "/register"
                        }
                        {...navForward}
                        className={buttonClass("secondary", "md", "w-full")}
                      >
                        {posting ? t("continueFree") : t("startFree")}
                      </Link>
                    ) : payHref ? (
                      <Link
                        href={payHref}
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
              );
            })}
          </ul>
          <p className="t-body-s text-fg-muted">
            {paymentsOn ? t("account.payNote") : t("soonNote")}
          </p>
        </Container>
      </Section>

      <Section labelledBy="commission-title">
        <Container className="flex flex-col gap-6">
          <h2 id="commission-title" className="t-h2">
            {t("account.commissionTitle")}
          </h2>
          <p className="t-body max-w-[60ch] text-fg-muted">
            {t("account.commissionIntro")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="t-label py-3 pr-4 text-fg-muted">
                    {t("account.commissionDeal")}
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan}
                      scope="col"
                      className="t-label py-3 pr-4 text-fg-muted"
                    >
                      {t(`account.tiers.${plan}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["freelance", "ugc"] as const).map((deal) => (
                  <tr key={deal} className="border-b border-line">
                    <th scope="row" className="py-3 pr-4 font-medium">
                      {t(`account.commission.${deal}`)}
                    </th>
                    {plans.map((plan) => (
                      <td key={plan} className="t-data py-3 pr-4">
                        {COMMISSION[deal][plan]}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="t-body-s max-w-[60ch] text-fg-muted">
            {t("account.commissionNote")}
          </p>
        </Container>
      </Section>

      <Section bordered labelledBy="oneoff-title">
        <Container className="flex flex-col gap-6">
          <h2 id="oneoff-title" className="t-h2">
            {t("account.oneOffTitle")}
          </h2>
          <p className="t-body max-w-[60ch] text-fg-muted">
            {t("account.oneOffIntro")}
          </p>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ONE_OFFS.map((item) => (
              <li
                key={item.code}
                className="flex flex-col gap-2 border border-line p-5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">
                    {t(`account.oneOff.${item.code}.name`)}
                  </h3>
                  <span className="t-data">${item.price}</span>
                </div>
                <p className="t-body-s text-fg-muted">
                  {t(`account.oneOff.${item.code}.text`)}
                </p>
                {item.live ? null : (
                  <p className="t-label text-fg-muted">{t("soon")}</p>
                )}
              </li>
            ))}
          </ul>
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
