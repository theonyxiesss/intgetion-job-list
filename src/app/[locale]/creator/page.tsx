import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { readAccountWallet } from "@/modules/users/service";
import {
  getMyCreatorProfile,
  getOwnCreatorProfile,
} from "@/modules/ugc/service";
import { readSharedProfile } from "@/modules/users/service";
import {
  ProfileForm,
  type CreatorFormDefaults,
} from "@/modules/ugc/ui/profile-form";
import { RouteMessages } from "@/components/shell/route-messages";

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
  // The form starts from the own profile, or from the shared one (D504).
  const own = await getOwnCreatorProfile(user.id);
  const shared = own ? null : await readSharedProfile(user.id);
  const defaults: CreatorFormDefaults | undefined = own
    ? {
        displayName: own.displayName,
        languages: own.languages,
        platforms: own.platforms,
        niches: own.niches,
        country: own.country,
        exampleUrls: own.exampleUrls,
        inviteOptIn: own.inviteOptIn,
        paused: own.status === "paused",
      }
    : shared
      ? {
          displayName: shared.displayName ?? "",
          languages: shared.languages.map((item) => item.code),
          platforms: [],
          niches: [],
          country: shared.country,
          exampleUrls: [],
          inviteOptIn: false,
          paused: false,
        }
      : undefined;
  const h = await getTranslations("ugcHub");
  const w = await getTranslations("ugc.workspace");
  const payout = mine.profile
    ? { address: (await readAccountWallet(user.id))?.address ?? null }
    : null;
  return (
    <RouteMessages namespaces={["ugc"]}>
      <main className="py-10 md:py-16">
        <Container className="flex flex-col gap-8">
          <PageHeader
            title={t("profileTitle")}
            intro={mine.profile?.displayName ?? t("empty")}
          />
          {mine.profile ? (
            <ButtonLink
              href="/creator/workspace"
              variant="secondary"
              className="self-start"
            >
              {w("title")}
            </ButtonLink>
          ) : null}
          <ProfileForm defaults={defaults} />
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
                href="/account#security"
                variant="secondary"
                className="self-start"
              >
                {h("payout.action")}
              </ButtonLink>
            </section>
          ) : null}
        </Container>
      </main>
    </RouteMessages>
  );
}
