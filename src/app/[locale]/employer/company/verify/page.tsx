import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { VerificationPanel } from "@/components/companies/verification-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  getCompaniesForUser,
  getVerificationState,
} from "@/modules/companies/service";

export default async function CompanyVerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);
  const query = await searchParams;
  const companies = await getCompaniesForUser(user.id);
  const company = companies.find((c) => c.id === query.company) ?? companies[0];
  if (!company || company.role !== "owner" || company.origin === "imported") {
    notFound();
  }
  const state = await getVerificationState(user, company.id);
  const t = await getTranslations("companyVerify");
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p>
        {t("status", { status: state.companyStatus })}
        {state.isTrusted ? ` · ${t("trusted")}` : ""}
      </p>
      <VerificationPanel
        companyId={company.id}
        domain={state.domain}
        companyStatus={state.companyStatus}
        steps={state.steps}
        requisites={state.requisites}
        initialToken={query.token ?? ""}
      />
    </main>
  );
}
