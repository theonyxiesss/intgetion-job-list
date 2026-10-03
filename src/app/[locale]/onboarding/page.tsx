import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Container, PageHeader } from "@/components/ui/container";
import { navForward } from "@/components/ui/page-transition";

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
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/"
            {...navForward}
            className="flex flex-col gap-2 border border-line p-6 hover:border-line-strong"
          >
            <h2 className="t-h3">{t("candidate")}</h2>
            <p className="text-fg-muted">{t("candidateDescription")}</p>
          </Link>
          <Link
            href="/employer/company"
            {...navForward}
            className="flex flex-col gap-2 border border-line p-6 hover:border-line-strong"
          >
            <h2 className="t-h3">{t("employer")}</h2>
            <p className="text-fg-muted">{t("employerDescription")}</p>
          </Link>
        </div>
      </Container>
    </main>
  );
}
