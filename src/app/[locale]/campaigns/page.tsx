import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listMyCampaigns } from "@/modules/ugc/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ugc");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const rows = user ? await listMyCampaigns(user.id) : [];
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} intro={t("intro")} />
        <p className="t-body-s max-w-[60ch] text-fg-muted">{t("moneyNote")}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/chat?from=campaigns">{t("openChat")}</ButtonLink>
          {user ? (
            <ButtonLink href="/campaigns/new" variant="secondary">
              {t("newBrief")}
            </ButtonLink>
          ) : (
            <ButtonLink href="/login?next=campaigns" variant="secondary">
              {t("signIn")}
            </ButtonLink>
          )}
        </div>
        {user && rows.length === 0 ? (
          <p className="text-fg-muted">{t("empty")}</p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-line p-4">
              <Link href={`/campaigns/${row.id}`} className="font-medium">
                {row.productName}
              </Link>
              <p className="t-body-s mt-1 font-mono text-fg-muted">
                {t(`status.${row.status}`)}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
