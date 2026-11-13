import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ButtonLink, Container } from "@/components/ui";
import { localePrefix } from "@/i18n/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  nonEvmNetwork,
  readyNonEvmNetworks,
} from "@/lib/billing/non-evm/networks";
import { SALE_PLANS } from "@/lib/billing/status";
import { payableCompanies, payableJobs } from "@/modules/billing/service";
import { CryptoPay } from "@/modules/billing/ui/crypto-pay";
import { InterestForm } from "@/modules/billing/ui/interest-form";
import { FreelancePay } from "@/modules/billing/ui/freelance-pay";
import { HttpError } from "@/lib/http";
import { getOrderForParty, orderPayState } from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";
import { campaignDepositState, readCampaign } from "@/modules/ugc/service";
import { RouteMessages } from "@/components/shell/route-messages";
import { flags } from "@/config/flags";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/logo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function salePlan(value: string | undefined): "hire" | "team" | "plus" | "pro" {
  if (value === "team" || value === "plus" || value === "pro") return value;
  return "hire";
}

function loginNext(plan: "hire" | "team" | "plus" | "pro"): string {
  if (plan === "team") return "billing-team";
  if (plan === "plus") return "billing-plus";
  if (plan === "pro") return "billing-pro";
  return "billing";
}

export default async function CryptoBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    job?: string;
    plan?: string;
    company?: string;
    /** A freelance order to pay to its freelancer (D463). */
    freelance?: string;
    /** The freelancer proves the payout address (D463). */
    payout?: string;
    /** `ugc`: a UGC creator proves the same payout address (D466). */
    for?: string;
    /** A UGC brief whose budget is paid in (D466). */
    ugc?: string;
  }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const plan = salePlan(query.plan);
  const job = query.job && UUID.test(query.job) ? query.job : "";
  const company =
    query.company && UUID.test(query.company) ? query.company : "";
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) {
    redirect(`${localePrefix(locale)}/login?next=${loginNext(plan)}`);
  }
  const t = await getTranslations("billing");
  const v2 = flags.uiV2Enabled;
  const product = await getTranslations("product");
  // v2 (UI_V2): the checkout mockup frame — back link, secure mark, cards.
  const heading = v2 ? (
    <header className="flex flex-col gap-6">
      <div className="relative left-1/2 grid w-[calc(100vw-2rem)] -translate-x-1/2 grid-cols-[1fr_auto_1fr] items-center gap-3 md:w-[calc(100vw-3rem)]">
        <Link
          href="/employer/billing"
          className="flex min-h-10 items-center gap-2 justify-self-start rounded-xl border border-line-strong px-3 text-sm hover:bg-surface"
        >
          <span aria-hidden="true">‹</span>
          {t("v2.back")}
        </Link>
        <Link href="/" className="flex items-center">
          <Logo name={product("wordmark")} />
        </Link>
        <span className="flex items-center gap-1.5 justify-self-end text-sm text-fg-muted">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v11H5z" />
          </svg>
          {t("v2.secure")}
        </span>
      </div>
      <h1 className="text-[22px] font-semibold tracking-tight">{t("title")}</h1>
    </header>
  ) : (
    <h1 className="t-h2">{t("title")}</h1>
  );
  const frame = v2 ? "flex flex-col gap-6 py-0" : undefined;
  const projectIdEarly =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
  const freelanceOrder =
    query.freelance && UUID.test(query.freelance) ? query.freelance : "";
  const ugcCampaign = query.ugc && UUID.test(query.ugc) ? query.ugc : "";
  const forUgc = query.for === "ugc" || Boolean(ugcCampaign);
  // The payout address is the account wallet now (D518).
  if (query.payout === "1")
    redirect(`${localePrefix(locale)}/account#security`);
  if (freelanceOrder || ugcCampaign) {
    const f = await getTranslations("freelance");
    const base = f.raw("pay") as Record<string, string>;
    const copy = forUgc
      ? {
          ...base,
          ...((await getTranslations("ugcHub")).raw("pay") as Record<
            string,
            string
          >),
        }
      : base;
    const panel = v2
      ? "flex w-full flex-col gap-4 rounded-[18px] border border-line bg-surface p-6"
      : "mx-auto flex w-full max-w-md flex-col gap-4 border border-line bg-surface p-6";
    let body: React.ReactNode;
    if (ugcCampaign) {
      let title = "";
      let state: Awaited<ReturnType<typeof campaignDepositState>> | null = null;
      try {
        title = (await readCampaign(user.id, ugcCampaign)).brief.productName;
        state = await campaignDepositState(user.id, ugcCampaign);
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
      }
      body =
        state && (state.payable || state.paid) ? (
          <FreelancePay
            orderId={ugcCampaign}
            title={title}
            amount={formatUsd(BigInt(state.budgetMinor), locale)}
            projectId={projectIdEarly}
            copy={copy}
            createUrl={`/api/ugc/campaigns/${ugcCampaign}/deposit`}
            paymentsBase="/api/ugc/deposits"
          />
        ) : (
          <div className={panel}>
            <p className="text-fg-muted">{copy.notPayable}</p>
            <ButtonLink
              href={state ? `/campaigns/${ugcCampaign}` : "/campaigns"}
              variant="secondary"
            >
              {copy.backToOrder}
            </ButtonLink>
          </div>
        );
    } else {
      let order: Awaited<ReturnType<typeof getOrderForParty>> | null = null;
      let state: Awaited<ReturnType<typeof orderPayState>> | null = null;
      try {
        order = await getOrderForParty(user.id, freelanceOrder);
        state = await orderPayState(user.id, freelanceOrder);
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
      }
      body =
        order &&
        state &&
        (state.payable || state.payment?.status === "paid") ? (
          <FreelancePay
            orderId={order.id}
            title={order.serviceTitle}
            amount={formatUsd(order.priceMinor, locale)}
            projectId={projectIdEarly}
            copy={copy}
          />
        ) : (
          <div className={panel}>
            <p className="text-fg-muted">{copy.notPayable}</p>
            <ButtonLink
              href={
                order ? `/freelance/orders/${order.id}` : "/freelance/orders"
              }
              variant="secondary"
            >
              {copy.backToOrder}
            </ButtonLink>
          </div>
        );
    }
    return (
      <main className={v2 ? "flex-1 overflow-x-hidden py-4" : "flex-1 py-10"}>
        <Container narrow={v2} className={frame ?? "flex flex-col gap-6"}>
          {heading}
          {body}
        </Container>
      </main>
    );
  }
  const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
  const evm =
    process.env.BILLING_ENABLED === "true" &&
    process.env.BILLING_CRYPTO_PROVIDER === "walletconnect" &&
    Boolean(process.env.COMPANY_WALLET_ADDRESS?.trim());
  // Solana and Tron stay in the code. Checkout does not offer them (EVM only).
  const networks = readyNonEvmNetworks().map((id) => ({
    id,
    tokens: Object.keys(nonEvmNetwork(id)?.tokens ?? {}) as ("USDC" | "USDT")[],
  }));
  const ready = evm || networks.length > 0;
  const rails = { evm, networks };
  const jobs =
    ready && plan === "hire" && !job ? await payableJobs(user.id) : [];
  const companies =
    ready && plan === "team" ? await payableCompanies(user.id) : [];
  const teamCompany =
    companies.find((item) => item.id === company) ??
    (companies.length === 1 ? companies[0] : undefined);
  const amount = (SALE_PLANS[plan].priceMinor / BigInt(100)).toString();
  const panel = v2
    ? "flex w-full flex-col gap-4 rounded-[18px] border border-line bg-surface p-6"
    : "mx-auto flex w-full max-w-md flex-col gap-4 border border-line bg-surface p-6";

  return (
    <RouteMessages namespaces={["billing"]}>
      <main className={v2 ? "flex-1 overflow-x-hidden py-4" : "flex-1 py-10"}>
        <Container narrow={v2} className={frame ?? "flex flex-col gap-6"}>
          {heading}
          {!ready ? (
            <InterestForm />
          ) : plan === "plus" || plan === "pro" ? (
            <CryptoPay
              plan={plan}
              amount={amount}
              projectId={projectId}
              {...rails}
            />
          ) : plan === "team" ? (
            teamCompany ? (
              <CryptoPay
                plan="team"
                amount={amount}
                companyId={teamCompany.id}
                projectId={projectId}
                {...rails}
              />
            ) : companies.length > 0 ? (
              <div className={panel}>
                <p className="text-fg-muted">{t("pickCompany")}</p>
                <ul className="flex flex-col gap-3">
                  {companies.map((item) => (
                    <li key={item.id}>
                      <ButtonLink
                        href={`/billing/crypto?plan=team&company=${item.id}`}
                        variant="secondary"
                        className="w-full"
                      >
                        {item.name}
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={panel}>
                <p className="text-fg-muted">{t("noCompany")}</p>
                <ButtonLink href="/employer/company">
                  {t("createCompany")}
                </ButtonLink>
              </div>
            )
          ) : job ? (
            <CryptoPay
              plan="hire"
              amount={amount}
              jobId={job}
              projectId={projectId}
              {...rails}
            />
          ) : jobs.length > 0 ? (
            <div className={panel}>
              <p className="text-fg-muted">{t("pickJob")}</p>
              <ul className="flex flex-col gap-3">
                {jobs.map((item) => (
                  <li key={item.id}>
                    <ButtonLink
                      href={`/billing/crypto?plan=hire&job=${item.id}`}
                      variant="secondary"
                      className="w-full"
                    >
                      {item.title}
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={panel}>
              <p className="text-fg-muted">{t("noJobs")}</p>
              <ButtonLink href="/employer/jobs/new">
                {t("postToPay")}
              </ButtonLink>
            </div>
          )}
        </Container>
      </main>
    </RouteMessages>
  );
}
