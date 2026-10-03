import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { CompanyForm } from "@/modules/companies/ui/company-form";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function EmployerCompanyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);
  const companies = await getCompaniesForUser(user.id);
  const company = companies[0];
  const t = await getTranslations("company");
  const formText = {
    name: t("form.name"),
    domain: t("form.domain"),
    website: t("form.website"),
    description: t("form.description"),
    logo: t("form.logo"),
    save: t("form.save"),
    error: t("form.error"),
    saved: t("form.saved"),
  };
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      {company ? (
        <>
          <p>
            {t("status")}: {company.status}
          </p>
          {company.origin !== "imported" && company.role === "owner" ? (
            <Link href="/employer/company/verify" className="underline">
              {t("verifyLink")}
            </Link>
          ) : null}
          {company.origin === "imported" ? (
            <p>{t("importedReadonly")}</p>
          ) : null}
          {company.origin !== "imported" &&
          (company.role === "owner" || company.role === "admin") ? (
            <CompanyForm
              action="edit"
              companyId={company.id}
              initial={company}
              text={formText}
            />
          ) : null}
        </>
      ) : (
        <CompanyForm action="create" text={formText} />
      )}
    </main>
  );
}
