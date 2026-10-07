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
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { Footer } from "@/components/shell/footer";
import { AnalyticsTracker } from "@/components/shell/analytics-tracker";
import { ServiceWorker } from "@/components/shell/service-worker";
import { CookieBanner } from "@/components/shell/cookie-banner";
import { Header } from "@/components/shell/header";
import { MiniAppBar } from "@/components/auth/mini-app-bar";
import { TelegramMiniApp } from "@/components/auth/telegram-mini-app";
import { flags } from "@/config/flags";
import {
  hasMiniAppMarker,
  isFramedRequest,
} from "@/lib/supabase/cookie-options";
import { hasSessionMark } from "@/lib/supabase/session-mark";
import { ToastProvider } from "@/components/ui";
import { routing, type AppLocale } from "@/i18n/routing";
import { TELEGRAM_WEB_APP_SCRIPT } from "@/lib/security-headers";
import { siteUrl, siteVerification } from "@/modules/seo/site";
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
  "savedSearches",
  "follows",
  "miniApp",
] as const;

// Only an explicit "light" choice changes the default dark theme (D141).
const themeScript = `(function(){try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light";}catch(e){}})();`;

// Capture Telegram's fragment before anything else can wipe it (D322).
const telegramHashScript = `(function(){try{var h=location.hash||"";if(h.indexOf("tgWebAppData")!==-1)sessionStorage.setItem("tg_web_app_hash",h);}catch(e){}})();`;

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
    // Absolute origin, so generated social images get full URLs (D278).
    metadataBase: new URL(siteUrl()),
    title: { default: product("name"), template: `%s · ${product("name")}` },
    description: t("description"),
    twitter: { card: "summary_large_image" },
    // Ownership proofs for the webmaster tools, when the founder set them (D298).
    verification: siteVerification(),
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
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const signedIn = hasSessionMark(requestHeaders);
  // Inside Telegram's frame the session cannot follow the person out (D316).
  const framed = isFramedRequest(requestHeaders);
  const inMiniApp = framed || hasMiniAppMarker(requestHeaders);
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
      <body className="flex min-h-full flex-col has-[[data-bottom-nav]]:pb-16 md:has-[[data-bottom-nav]]:pb-0">
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {flags.telegramMiniAppEnabled && (
          <>
            {/* Phone clients expose initData through this bridge (D324). */}
            <Script
              src={TELEGRAM_WEB_APP_SCRIPT}
              strategy="beforeInteractive"
            />
            <script
              nonce={nonce}
              dangerouslySetInnerHTML={{ __html: telegramHashScript }}
            />
          </>
        )}
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
            <AnalyticsTracker />
            {flags.telegramMiniAppEnabled && !signedIn && (
              <TelegramMiniApp locale={locale as AppLocale} />
            )}
            {flags.telegramMiniAppEnabled && signedIn && inMiniApp && (
              <MiniAppBar locale={locale as AppLocale} />
            )}
            <ServiceWorker />
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
                gpcHint: t("cookies.gpcHint"),
                more: t("cookies.more"),
              }}
            />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
