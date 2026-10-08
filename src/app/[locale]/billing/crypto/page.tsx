import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ButtonLink, Container } from "@/components/ui";
import { localePrefix } from "@/i18n/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { SALE_PLANS } from "@/lib/billing/status";
import { payableCompanies, payableJobs } from "@/modules/billing/service";
import { CryptoPay } from "@/modules/billing/ui/crypto-pay";
import { InterestForm } from "@/modules/billing/ui/interest-form";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  searchParams: Promise<{ job?: string; plan?: string; company?: string }>;
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
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
  const ready =
    process.env.BILLING_ENABLED === "true" &&
    process.env.BILLING_CRYPTO_PROVIDER === "walletconnect" &&
    Boolean(process.env.COMPANY_WALLET_ADDRESS?.trim());
  const jobs = ready && plan === "hire" && !job ? await payableJobs(user.id) : [];
  const companies =
    ready && plan === "team" ? await payableCompanies(user.id) : [];
  const teamCompany =
    companies.find((item) => item.id === company) ??
    (companies.length === 1 ? companies[0] : undefined);
  const amount = (SALE_PLANS[plan].priceMinor / BigInt(100)).toString();
  const panel = "mx-auto flex w-full max-w-md flex-col gap-4 border border-line bg-surface p-6";

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-6">
        <h1 className="t-h2">{t("title")}</h1>
        {!ready ? (
          <InterestForm />
        ) : plan === "plus" || plan === "pro" ? (
          <CryptoPay plan={plan} amount={amount} projectId={projectId} />
        ) : plan === "team" ? (
          teamCompany ? (
            <CryptoPay
              plan="team"
              amount={amount}
              companyId={teamCompany.id}
              projectId={projectId}
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
              <ButtonLink href="/employer/company">{t("createCompany")}</ButtonLink>
            </div>
          )
        ) : job ? (
          <CryptoPay plan="hire" amount={amount} jobId={job} projectId={projectId} />
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
            <ButtonLink href="/employer/jobs/new">{t("postToPay")}</ButtonLink>
          </div>
        )}
      </Container>
    </main>
  );
}
