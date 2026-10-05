import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Roboto_Condensed } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ToastProvider } from "@/components/ui";
import { routing } from "@/i18n/routing";
import "../../globals.css";

const display = Roboto_Condensed({
  subsets: ["latin"],
  weight: "600",
  display: "optional",
  variable: "--font-roboto-condensed",
});

const CLIENT_NAMESPACES = ["nav", "ui", "admin", "locale"] as const;

const themeScript = `(function(){try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light";}catch(e){}})();`;

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark light",
};

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function AdminRootLayout({
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
            <div id="content" tabIndex={-1} className="flex flex-1 flex-col">
              {children}
            </div>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
