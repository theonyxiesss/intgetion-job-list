import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Container, PageHeader } from "@/components/ui/container";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getMyCreatorProfile } from "@/modules/ugc/service";
import { ProfileForm } from "@/modules/ugc/ui/profile-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("profileTitle"), robots: { index: false, follow: false } };
}

export default async function CreatorPage({
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
  const mine = await getMyCreatorProfile(user.id);
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader
          title={t("profileTitle")}
          intro={mine.profile?.displayName ?? t("empty")}
        />
        <ProfileForm />
      </Container>
    </main>
  );
}
