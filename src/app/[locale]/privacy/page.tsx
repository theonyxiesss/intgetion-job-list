import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { CookieChoice } from "@/components/settings/cookie-choice";
import { Container } from "@/components/ui";
import { LEGAL_DETAILS } from "@/config/legal";
import { legalText } from "@/content/legal";
import { CONSENT_COOKIE, consentInForce } from "@/lib/consent";
import { languageAlternates, siteUrl } from "@/modules/seo/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("privacyTitle"),
    alternates: {
      canonical: `${siteUrl()}/${locale}/privacy`,
      languages: languageAlternates("/privacy"),
    },
  };
}

/**
 * Privacy policy with the cookie choice right under it (D241): anyone,
 * signed in or not, can change the choice here.
 */
export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const settings = await getTranslations("settings");
  const consent = consentInForce((await cookies()).get(CONSENT_COOKIE)?.value);
  const gpc = (await headers()).get("sec-gpc") === "1";
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-10">
        <LegalDocument
          markdown={legalText("privacy", locale)}
          values={LEGAL_DETAILS}
          missing={t("toBeSpecified")}
        />
        <div id="cookie-settings" className="max-w-[72ch] scroll-mt-24">
          <CookieChoice
            initial={consent}
            gpc={gpc}
            text={{
              title: settings("cookies.title"),
              text: settings("cookies.text"),
              necessary: settings("cookies.necessary"),
              necessaryHint: settings("cookies.necessaryHint"),
              preferences: settings("cookies.preferences"),
              preferencesHint: settings("cookies.preferencesHint"),
              analytics: settings("cookies.analytics"),
              analyticsHint: settings("cookies.analyticsHint"),
              gpcHint: settings("cookies.gpcHint"),
              saved: settings("cookies.saved"),
            }}
          />
        </div>
      </Container>
    </main>
  );
}
