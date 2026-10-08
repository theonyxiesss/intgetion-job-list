import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { localePrefix } from "@/i18n/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { billingMe } from "@/modules/billing/service";

export default async function EmployerBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login`);
  const me = await billingMe(user.id);
  const t = await getTranslations("billing");

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-6">
        <h1 className="t-display-l">{t("title")}</h1>
        <p className="t-h3">{me.plan === "hire" ? t("hire") : t("start")}</p>
        <p className="max-w-[60ch] text-fg-muted">{t("startHint")}</p>
        <ul className="flex flex-col gap-2">
          {me.hires.map((hire) => (
            <li key={hire.jobId}>
              {t("hireUntil", {
                date: hire.validUntil.slice(0, 10),
              })}
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
