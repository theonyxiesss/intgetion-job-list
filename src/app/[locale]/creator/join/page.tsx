import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Container, PageHeader } from "@/components/ui/container";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { UgcAction } from "@/modules/ugc/ui/action";

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

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("ugc");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect({ href: "/login", locale });
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-6">
        <PageHeader title={t("title")} intro={t("moneyNote")} />
        {token ? (
          <UgcAction action="redeem" label={t("apply")} body={{ payload: token }} primary />
        ) : (
          <p>{t("error")}</p>
        )}
      </Container>
    </main>
  );
}
