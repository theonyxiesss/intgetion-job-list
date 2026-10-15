import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ButtonLink, Container } from "@/components/ui";
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
  const nav = await getTranslations("nav");

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <h1 className="t-display-l">{t("title")}</h1>
        <section className="flex flex-col gap-2">
          <h2 className="t-h3">
            {me.plan === "team"
              ? t("team")
              : me.plan === "hire"
                ? t("hire")
                : t("start")}
          </h2>
          {me.teamUntil ? (
            <p className="t-data">
              {t("teamUntil", { date: me.teamUntil.slice(0, 10) })}
            </p>
          ) : null}
        </section>
        {me.candidatePlan !== "free" ? (
          <section className="flex flex-col gap-2">
            <h2 className="t-h3">{t(me.candidatePlan)}</h2>
            {me.candidateUntil ? (
              <p className="t-data">
                {t("planUntil", { date: me.candidateUntil.slice(0, 10) })}
              </p>
            ) : null}
          </section>
        ) : null}
        {me.hires.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {me.hires.map((hire) => (
              <li key={hire.jobId}>
                {t("hireUntil", {
                  date: hire.validUntil.slice(0, 10),
                })}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="max-w-[60ch] text-fg-muted">{t("startHint")}</p>
        <ButtonLink href="/pricing" variant="secondary">
          {nav("pricing")}
        </ButtonLink>
      </Container>
    </main>
  );
}
