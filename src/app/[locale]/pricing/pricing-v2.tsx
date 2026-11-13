// v2 (UI_V2) layout of this route; page.tsx renders it when the flag is on.
import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
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

/**
 * /pricing (docs/PRICING_UX.md, section 2; D587): one set of plans per
 * account, one-off purchases and the deal commission (D586). A guest who
 * clicks pay goes to login. A signed-in user opens checkout (D358).
 */
export async function PricingPageV2({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ for?: string; next?: string; period?: string }>;
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
  // v2: the mockup's «Month / Year» switch shows the yearly prices.
  const yearly = query.period === "year";
  const bestSaving = Math.max(
    ...ACCOUNT_PLANS.filter((tier) => tier.price && tier.yearly).map((tier) =>
      Math.round((1 - tier.yearly! / (tier.price! * 12)) * 100),
    ),
  );
  const periodHref = (period: "month" | "year") => {
    const params = new URLSearchParams();
    if (query.for) params.set("for", query.for);
    if (query.next) params.set("next", query.next);
    if (period === "year") params.set("period", "year");
    const text = params.toString();
    return text ? `/pricing?${text}` : "/pricing";
  };

  return (
    <main>
      <JsonLd data={faqPageJsonLd(faq)} />
      <section className="px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[30px] font-semibold tracking-tight">
              {t("v2.title")}
            </h1>
            <p className="max-w-[60ch] text-[15px] text-fg-muted">
              {t("v2.intro")}
            </p>
          </div>
          <nav
            aria-label={t("v2.period")}
            className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
          >
            <Link
              href={periodHref("month")}
              aria-current={!yearly ? "page" : undefined}
              className={`rounded-lg px-4 py-1.5 text-sm ${!yearly ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg"}`}
            >
              {t("v2.month")}
            </Link>
            <Link
              href={periodHref("year")}
              aria-current={yearly ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm ${yearly ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg"}`}
            >
              {t("v2.year")}
              {bestSaving > 0 ? (
                <span className="rounded-md bg-accent/15 px-1.5 text-xs text-accent">
                  {t("v2.saving", { percent: bestSaving })}
                </span>
              ) : null}
            </Link>
          </nav>
          <h2 id="tiers-title" className="sr-only">
            {t("account.plansTitle")}
          </h2>
          <ul className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ACCOUNT_PLANS.map((tier) => {
              const payHref = planPayHref(paymentsOn, tier.code, signedIn);
              const showYear = yearly && tier.yearly !== undefined;
              return (
                <li
                  key={tier.code}
                  className={cn(
                    "relative flex flex-col gap-4 rounded-[18px] border p-6",
                    tier.recommended
                      ? "border-line-strong bg-surface-2 max-md:order-first"
                      : "border-line bg-surface",
                  )}
                >
                  {tier.recommended && (
                    <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-fg">
                      {t("v2.popular")}
                    </span>
                  )}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[17px] font-semibold">
                      {t(`account.tiers.${tier.code}.name`)}
                    </h3>
                    <p className="min-h-10 text-sm text-fg-muted">
                      {t(`account.tiers.${tier.code}.for`)}
                    </p>
                  </div>
                  <p className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-[32px] leading-none font-semibold tracking-tight tabular-nums">
                      {tier.price === null
                        ? "$0"
                        : `$${showYear ? tier.yearly : tier.price}`}
                    </span>
                    <span className="text-sm text-fg-muted">
                      {tier.price === null
                        ? t("v2.forever")
                        : showYear
                          ? t("v2.perYear")
                          : t("v2.perMonth")}
                    </span>
                  </p>
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
                      className="flex min-h-11 w-full items-center justify-center rounded-xl border border-line-strong text-sm font-medium hover:bg-surface-2"
                    >
                      {posting ? t("continueFree") : t("startFree")}
                    </Link>
                  ) : payHref ? (
                    <Link
                      href={payHref}
                      {...navForward}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold",
                        tier.recommended
                          ? "bg-fg text-bg hover:opacity-90"
                          : "border border-line-strong hover:bg-surface-2",
                      )}
                    >
                      {t("payHire")}
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className={cn(
                        "flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold opacity-60",
                        tier.recommended
                          ? "bg-fg text-bg"
                          : "border border-line-strong",
                      )}
                    >
                      {t("soon")}
                    </span>
                  )}
                  <ul className="flex flex-col gap-2.5 pt-1">
                    {tier.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm">
                        <Icon
                          icon={Check}
                          size={16}
                          className="mt-0.5 shrink-0 text-fg-subtle"
                        />
                        <span>
                          {t(`account.tiers.${tier.code}.points.${point}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
          <div className="grid w-full gap-3 md:grid-cols-2">
            <p className="flex items-start gap-3 rounded-[18px] border border-line bg-surface p-4 text-sm text-fg-muted">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              >
                <path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v11H5z" />
              </svg>
              {paymentsOn ? t("account.payNote") : t("soonNote")}
            </p>
            <p className="flex items-start gap-3 rounded-[18px] border border-line bg-surface p-4 text-sm text-fg-muted">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"
              />
              <span>
                {t("helpChoosing")}{" "}
                <Link
                  href="/chat"
                  className="font-medium text-fg hover:underline"
                  {...navForward}
                >
                  {t("askSpoki")}
                </Link>
              </span>
            </p>
          </div>
        </div>
      </section>

      <Section labelledBy="commission-title" className="py-12 md:py-16">
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

      <Section bordered labelledBy="oneoff-title" className="py-12 md:py-16">
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
                className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5"
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

      <Section labelledBy="free-title" className="py-12 md:py-16">
        <Container className="flex flex-col gap-8">
          <h2 id="free-title" className="t-h2">
            {t("alwaysFreeTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ALWAYS_FREE.map((key) => (
              <li
                key={key}
                className="rounded-lg border border-line bg-surface p-5"
              >
                {t(`alwaysFree.${key}`)}
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section bordered labelledBy="faq-title" className="py-12 md:py-16">
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
