import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, JetBrains_Mono, Roboto_Condensed } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { Footer } from "@/components/shell/footer";
import { Header } from "@/components/shell/header";
import { ToastProvider } from "@/components/ui";
import { routing } from "@/i18n/routing";
import "../globals.css";

// Fonts are self-hosted by next/font at build time (DESIGN.md 4.1, 12).
const display = Roboto_Condensed({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-roboto-condensed",
});
const text = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
  variable: "--font-jetbrains-mono",
});

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

  return (
    <html
      lang={locale}
      className={`h-full ${display.variable} ${text.variable} ${mono.variable}`}
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
        <NextIntlClientProvider>
          <ToastProvider closeLabel={t("ui.close")}>
            <Header />
            <div id="content" tabIndex={-1} className="flex flex-1 flex-col">
              {children}
            </div>
            <Footer />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
