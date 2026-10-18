import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { Footer } from "@/components/shell/footer";
import { AnalyticsTracker } from "@/components/shell/analytics-tracker";
import { ServiceWorker } from "@/components/shell/service-worker";
import { CookieBanner } from "@/components/shell/cookie-banner";
import { Header } from "@/components/shell/header";
import { SiteRail, type SiteRailData } from "@/components/shell/site-rail";
import { railServices } from "@/components/shell/rail-items";
import { JOB_CATEGORIES } from "@/config/markers";
import { MiniAppBar } from "@/components/auth/mini-app-bar";
import { TelegramLoginResume } from "@/components/auth/telegram-login-resume";
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
import { TELEGRAM_WEB_APP_BOOT_SCRIPT } from "@/lib/telegram-web-app-boot";
import { siteUrl, siteVerification } from "@/modules/seo/site";
import { SHELL_NAMESPACES, pickMessages } from "@/i18n/client-messages";
import "../globals.css";
import { fontVariables } from "../fonts";
import { localePrefix } from "@/i18n/paths";

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
          {
            url: `${localePrefix(locale)}/jobs/rss.xml`,
            title: product("name"),
          },
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
  // Labels only: the client part of the rail keeps no message namespace (D476, D477).
  const rail: SiteRailData = {
    label: t("nav.rail"),
    sectionsTitle: t("nav.railSections"),
    categoriesTitle: t("nav.railCategories"),
    services: railServices.map((link) => ({
      href: link.href,
      label: t(link.label),
    })),
    categories: JOB_CATEGORIES.map((id) => ({
      id,
      label: t(`categories.${id}`),
    })),
  };
  // Only the shell namespaces go into every page (D41b, D476); a page adds
  // its own with RouteMessages.
  const clientMessages = pickMessages(
    (await getMessages()) as Record<string, unknown>,
    SHELL_NAMESPACES,
  );

  return (
    <html
      lang={locale}
      className={`h-full ${fontVariables}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col has-[[data-bottom-nav]]:pb-[calc(4rem+env(safe-area-inset-bottom))] md:has-[[data-bottom-nav]]:pb-0">
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
              dangerouslySetInnerHTML={{ __html: TELEGRAM_WEB_APP_BOOT_SCRIPT }}
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
              {/* Left rail from 1280 px, kept across navigations (D477, D489). */}
              <div className="flex w-full flex-1 flex-col xl:has-[>[data-rail]]:mx-auto xl:has-[>[data-rail]]:grid xl:has-[>[data-rail]]:max-w-[1376px] xl:has-[>[data-rail]]:grid-cols-[300px_minmax(0,1fr)]">
                <SiteRail data={rail} />
                <div className="flex min-w-0 flex-1 flex-col">{children}</div>
              </div>
            </div>
            <Footer />
            <AnalyticsTracker />
            <TelegramLoginResume />
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
