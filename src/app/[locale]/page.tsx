import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Chat } from "@/components/bot/chat";
import { MorrowHome } from "@/components/morrow/morrow-home";
import { RouteMessages } from "@/components/shell/route-messages";
import { routing } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { JsonLd } from "@/modules/seo/json-ld";
import { homeGraphJsonLd } from "@/modules/seo/markup";
import { languageAlternates, siteUrl } from "@/modules/seo/site";
import { localePrefix } from "@/i18n/paths";

/** The home page is the platform chat (TZ 53): every service is asked there. */
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** The home page carries the words people search for (D277). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const product = await getTranslations({ locale, namespace: "product" });
  const title = `${t("homeTitle")} — ${product("wordmark")}`;
  return {
    // Absolute: the layout template would append the product name again.
    title: { absolute: title },
    description: t("homeDescription"),
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}`,
      languages: languageAlternates(""),
    },
    openGraph: {
      type: "website",
      title,
      description: t("homeDescription"),
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const product = await getTranslations("product");
  const morrow = await getTranslations("morrow");
  const jobs = await getTranslations("jobs");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const signedIn = user !== null;
  const cardText = {
    salary: jobs("salaryMin"),
    worldwide: jobs("worldwide"),
    viewJob: jobs("viewJob"),
    formats: {
      remote: jobs("remote"),
      hybrid: jobs("hybrid"),
      onsite: jobs("onsite"),
    },
    periods: { hour: jobs("hour"), month: jobs("month"), year: jobs("year") },
  };

  return (
    <RouteMessages
      namespaces={[
        "morrow",
        "chat",
        "explain",
        "ugc",
        "notifications",
        "notificationSettings",
        "jobs",
        "categories",
      ]}
    >
      <JsonLd
        data={homeGraphJsonLd({
          name: product("name"),
          url: siteUrl(),
          logoUrl: `${siteUrl()}/icons/icon-512.png`,
          locale,
        })}
      />
      <MorrowHome signedIn={signedIn} wordmark={product("wordmark")}>
        <main className="flex min-h-0 flex-1 flex-col">
          <Chat
            signedIn={signedIn}
            jobCardText={cardText}
            voiceSoon={morrow("voice")}
            jobActions
            canAttach
          />
        </main>
      </MorrowHome>
    </RouteMessages>
  );
}
