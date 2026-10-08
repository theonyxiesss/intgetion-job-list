import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ButtonLink, Container } from "@/components/ui";
import { localePrefix } from "@/i18n/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { payableJobs } from "@/modules/billing/service";
import { CryptoPay } from "@/modules/billing/ui/crypto-pay";
import { InterestForm } from "@/modules/billing/ui/interest-form";

export default async function CryptoBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { locale } = await params;
  const { job } = await searchParams;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login?next=billing`);
  const t = await getTranslations("billing");
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
  const ready =
    process.env.BILLING_ENABLED === "true" &&
    process.env.BILLING_CRYPTO_PROVIDER === "walletconnect" &&
    Boolean(process.env.COMPANY_WALLET_ADDRESS?.trim());
  const jobs = ready && !job ? await payableJobs(user.id) : [];

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-6">
        <h1 className="t-display-l">{t("title")}</h1>
        {ready && job ? (
          <CryptoPay jobId={job} projectId={projectId} />
        ) : ready ? (
          jobs.length > 0 ? (
            <div className="flex max-w-xl flex-col gap-4">
              <p className="text-fg-muted">{t("pickJob")}</p>
              <ul className="flex flex-col gap-3">
                {jobs.map((item) => (
                  <li key={item.id}>
                    <ButtonLink
                      href={`/billing/crypto?job=${item.id}`}
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
            <div className="flex max-w-xl flex-col gap-4">
              <p className="text-fg-muted">{t("noJobs")}</p>
              <ButtonLink href="/employer/jobs/new">{t("postToPay")}</ButtonLink>
            </div>
          )
        ) : (
          <InterestForm />
        )}
      </Container>
    </main>
  );
}
