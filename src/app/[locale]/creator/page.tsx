import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getPayoutStatus } from "@/modules/freelance/service";
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
  const h = await getTranslations("ugcHub");
  const payout = mine.profile ? await getPayoutStatus(user.id) : null;
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader
          title={t("profileTitle")}
          intro={mine.profile?.displayName ?? t("empty")}
        />
        <ProfileForm />
        {payout ? (
          <section
            className="flex flex-col gap-3 rounded-lg border border-line p-4 md:p-5"
            aria-labelledby="ugc-payout"
          >
            <h2 id="ugc-payout" className="font-medium">
              {h("payout.title")}
            </h2>
            <p className="t-body-s text-fg-muted">{h("payout.text")}</p>
            <p className="font-mono text-sm break-all">
              {payout.address ?? h("payout.none")}
            </p>
            <ButtonLink
              href="/billing/crypto?payout=1&for=ugc"
              variant="secondary"
              className="self-start"
            >
              {h("payout.action")}
            </ButtonLink>
          </section>
        ) : null}
      </Container>
    </main>
  );
}
