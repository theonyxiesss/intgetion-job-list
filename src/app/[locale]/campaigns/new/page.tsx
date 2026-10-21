import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessageSquare } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { readBriefDraft, ugcPriceGuide } from "@/modules/ugc/service";
import { BriefForm } from "@/modules/ugc/ui/brief-form";
import { DeskShell, NeedCompany } from "@/modules/ugc/ui/desk";
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

/**
 * The brief form inside the workspace (D519). It edits the same brief draft
 * Spoki fills in the chat (D492); the chat stays one click away (D516).
 */
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
  const d = await getTranslations("ugcDesk");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }
  const companies = await getCompaniesForUser(user.id);
  return (
    <RouteMessages namespaces={["ugc", "ugcDesk"]}>
      <DeskShell
        active="campaigns"
        title={t("newBrief")}
        intro={d("newIntro")}
        actions={
          <ButtonLink
            href="/chat?from=campaigns"
            variant="secondary"
            icon={<Icon icon={MessageSquare} size={16} />}
          >
            {d("fillWithSpoki")}
          </ButtonLink>
        }
      >
        {companies.length === 0 ? (
          <NeedCompany />
        ) : (
          <BriefForm
            companies={companies.map((row) => ({
              id: row.id,
              name: row.name,
            }))}
            guide={await ugcPriceGuide()}
            draft={await readBriefDraft(user.id, query.draft)}
          />
        )}
      </DeskShell>
    </RouteMessages>
  );
}
