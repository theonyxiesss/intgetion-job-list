import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { VerificationPanel } from "@/components/companies/verification-panel";
import { Badge, Container, StatusBadge } from "@/components/ui";
import { CompanyTabs } from "../company-tabs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  getCompaniesForUser,
  getVerificationState,
} from "@/modules/companies/service";
import { localePrefix } from "@/i18n/paths";

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
  if (!user) redirect(`${localePrefix(locale)}/login`);
  const query = await searchParams;
  const companies = await getCompaniesForUser(user.id);
  const company = companies.find((c) => c.id === query.company) ?? companies[0];
  if (!company || company.role !== "owner" || company.origin === "imported") {
    notFound();
  }
  const state = await getVerificationState(user, company.id);
  const t = await getTranslations("companyVerify");
  const companyT = await getTranslations("company");
  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="t-label text-fg-muted">{t("title")}</p>
          <h1 className="t-display-l">{company.name}</h1>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={state.companyStatus}>
              {companyT(`statusLabel.${state.companyStatus}`)}
            </StatusBadge>
            {state.isTrusted && <Badge tone="trusted">{t("trusted")}</Badge>}
          </div>
        </header>
        <CompanyTabs active="verify" showVerify />
        <VerificationPanel
          companyId={company.id}
          domain={state.domain}
          companyStatus={state.companyStatus}
          steps={state.steps}
          requisites={state.requisites}
          initialToken={query.token ?? ""}
        />
      </Container>
    </main>
  );
}
