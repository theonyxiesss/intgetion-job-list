import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("onboarding");
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/${locale}`}
          className="rounded-lg border border-current/30 p-6"
        >
          <h2 className="text-xl font-medium">{t("candidate")}</h2>
          <p className="mt-2">{t("candidateDescription")}</p>
        </Link>
        <Link
          href={`/${locale}/employer/company`}
          className="rounded-lg border border-current/30 p-6"
        >
          <h2 className="text-xl font-medium">{t("employer")}</h2>
          <p className="mt-2">{t("employerDescription")}</p>
        </Link>
      </div>
    </main>
  );
}
