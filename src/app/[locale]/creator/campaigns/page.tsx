import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Container, PageHeader } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { formatMinor } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listOpenCampaigns } from "@/modules/ugc/service";
import { UgcAction } from "@/modules/ugc/ui/action";
import { RouteMessages } from "@/components/shell/route-messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("openTitle"), robots: { index: false, follow: false } };
}

export default async function OpenBriefsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ugc");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }
  const rows = await listOpenCampaigns(user.id);
  return (
    <RouteMessages namespaces={["ugc"]}>
      <main className="py-10 md:py-16">
        <Container className="flex flex-col gap-6">
          <PageHeader title={t("openTitle")} />
          {rows.length === 0 ? (
            <p className="text-fg-muted">{t("emptyOpen")}</p>
          ) : null}
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <li key={row.id} className="rounded-lg border border-line p-4">
                <Link href={`/campaigns/${row.id}`} className="font-medium">
                  {row.productName}
                </Link>
                <p className="mt-1 font-mono">
                  {formatMinor(BigInt(row.bountyMinor), "USD", locale, {
                    wholeWhenEven: true,
                  })}
                </p>
                <div className="mt-3">
                  <UgcAction
                    action="apply"
                    label={t("apply")}
                    body={{ campaignId: row.id }}
                    primary
                  />
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </main>
    </RouteMessages>
  );
}
