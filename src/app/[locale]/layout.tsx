import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Roboto_Condensed } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { Footer } from "@/components/shell/footer";
import { CookieBanner } from "@/components/shell/cookie-banner";
import { Header } from "@/components/shell/header";
import { ToastProvider } from "@/components/ui";
import { routing } from "@/i18n/routing";
import "../globals.css";

// One web font, for display text only (DESIGN.md 4.1, D144): Roboto
// Condensed 600, Latin preloaded, Cyrillic loaded by unicode-range on demand.
// "optional" never repaints the LCP text. Body and figures use system fonts.
const display = Roboto_Condensed({
  subsets: ["latin"],
  weight: "600",
  display: "optional",
  variable: "--font-roboto-condensed",
});
/** Namespaces used by "use client" components; add one when a client component needs it. */
const CLIENT_NAMESPACES = [
  "nav",
  "chat",
  "explain",
  "ui",
  "locale",
  "error",
  "auth",
  "applications",
  "profile",
  "companyVerify",
  "admin",
  "notifications",
  "notificationSettings",
  "jobActions",
  "savedJobs",
  "settings",
] as const;

// Only an explicit "light" choice changes the default dark theme (D141).
const themeScript = `(function(){try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light";}catch(e){}})();`;

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark light",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const product = await getTranslations({ locale, namespace: "product" });
  return {
    title: { default: product("name"), template: `%s · ${product("name")}` },
    description: t("description"),
    // RSS of the newest jobs for feed readers and bots (D204).
    alternates: {
      types: {
        "application/rss+xml": [
          { url: `/${locale}/jobs/rss.xml`, title: product("name") },
        ],
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const t = await getTranslations();
  // Only namespaces that client components read go into the page (D41b);
  // the full catalogue added ~22 KB to every HTML document.
  const all = await getMessages();
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((key) => key in all).map((key) => [key, all[key]]),
  );

  return (
    <html
      lang={locale}
      className={`h-full ${display.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <a
          href="#content"
          className="t-nav sr-only z-50 bg-accent px-4 py-3 text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {t("nav.skip")}
        </a>
        <NextIntlClientProvider messages={clientMessages}>
          <ToastProvider closeLabel={t("ui.close")}>
            <Header />
            <div id="content" tabIndex={-1} className="flex flex-1 flex-col">
              {children}
            </div>
            <Footer />
            <CookieBanner
              text={{
                label: t("cookies.label"),
                text: t("cookies.text"),
                acceptAll: t("cookies.acceptAll"),
                necessaryOnly: t("cookies.necessaryOnly"),
                customize: t("cookies.customize"),
                save: t("cookies.save"),
                preferences: t("cookies.preferences"),
                preferencesHint: t("cookies.preferencesHint"),
                analytics: t("cookies.analytics"),
                analyticsHint: t("cookies.analyticsHint"),
              }}
            />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
