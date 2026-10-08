import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { localePrefix } from "@/i18n/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
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
  if (!user) redirect(`${localePrefix(locale)}/login`);
  const t = await getTranslations("billing");
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
  const ready =
    process.env.BILLING_ENABLED === "true" &&
    process.env.BILLING_CRYPTO_PROVIDER === "walletconnect" &&
    Boolean(process.env.COMPANY_WALLET_ADDRESS?.trim());

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-6">
        <h1 className="t-display-l">{t("title")}</h1>
        {ready && job ? (
          <CryptoPay jobId={job} projectId={projectId} />
        ) : (
          <InterestForm />
        )}
      </Container>
    </main>
  );
}
