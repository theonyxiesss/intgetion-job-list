import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Container, PageHeader } from "@/components/ui/container";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { readBriefDraft, ugcPriceGuide } from "@/modules/ugc/service";
import { BriefForm } from "@/modules/ugc/ui/brief-form";
import { RouteMessages } from "@/components/shell/route-messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("newBrief"), robots: { index: false, follow: false } };
}

export default async function NewCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("ugc");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }
  const companies = await getCompaniesForUser(user.id);
  const briefDraft = await readBriefDraft(user.id, query.draft);
  return (
    <RouteMessages namespaces={["ugc"]}>
      <main className="py-10 md:py-16">
        <Container className="flex flex-col gap-8">
          <PageHeader title={t("newBrief")} intro={t("moneyNote")} />
          {companies.length === 0 ? (
            <p>{t("needCompany")}</p>
          ) : (
            <BriefForm
              companies={companies.map((row) => ({
                id: row.id,
                name: row.name,
              }))}
              guide={await ugcPriceGuide()}
              draft={briefDraft}
            />
          )}
        </Container>
      </main>
    </RouteMessages>
  );
}
