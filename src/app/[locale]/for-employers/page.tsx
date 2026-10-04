import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { navForward } from "@/components/ui/page-transition";
import { Link } from "@/i18n/navigation";
import { hasSessionMark } from "@/lib/supabase/session-mark";

const steps = ["company", "job", "match", "contacts"] as const;
const reasons = ["match", "salary", "both", "trust"] as const;
const levels = [
  { key: "unverified", icon: ShieldQuestion, tone: "text-fg-muted" },
  { key: "verified", icon: BadgeCheck, tone: "text-success" },
  { key: "trusted", icon: ShieldCheck, tone: "text-success" },
] as const;
const questions = ["price", "limit", "review", "contacts", "salary"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forEmployers" });
  return { title: t("title"), description: t("metaDescription") };
}

/** For employers (DESIGN 9.14, D204): static text, no database reads. */
export default async function ForEmployersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forEmployers");
  // The proxy marks a checked session (D41): signed-in users go to the form.
  const ctaHref = hasSessionMark(await headers())
    ? "/employer/jobs/new"
    : "/register";
  const cta = (
    <Link
      href={ctaHref}
      {...navForward}
      className={buttonClass("primary", "lg", "self-start")}
    >
      {t("cta")}
      <Icon icon={ArrowRight} />
    </Link>
  );

  return (
    <main>
      <Section>
        <Container className="flex flex-col gap-6">
          <p className="t-label text-fg-muted">{t("label")}</p>
          <h1 className="t-display-l max-w-[20ch]">{t("heroTitle")}</h1>
          <p className="t-body-l max-w-[60ch] text-fg-muted">{t("heroText")}</p>
          {cta}
        </Container>
      </Section>

      <Section bordered labelledBy="steps-title">
        <Container className="flex flex-col gap-10">
          <h2 id="steps-title" className="t-h2">
            {t("stepsTitle")}
          </h2>
          <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step}>
                <p className="t-data text-fg-muted">0{index + 1}</p>
                <h3 className="t-h3 mt-3">{t(`steps.${step}.title`)}</h3>
                <p className="mt-2 text-fg-muted">{t(`steps.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section labelledBy="why-title">
        <Container className="flex flex-col gap-8">
          <h2 id="why-title" className="t-h2">
            {t("whyTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {reasons.map((reason) => (
              <li key={reason} className="border border-line p-5">
                {t(`why.${reason}`)}
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section bordered labelledBy="verify-title">
        <Container className="flex flex-col gap-8">
          <h2 id="verify-title" className="t-h2">
            {t("verifyTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {levels.map((level) => (
              <li
                key={level.key}
                className="flex flex-col gap-2 border border-line p-5"
              >
                <span className={level.tone}>
                  <Icon icon={level.icon} size={24} />
                </span>
                <h3 className="t-h3">{t(`verify.${level.key}.title`)}</h3>
                <p className="text-fg-muted">{t(`verify.${level.key}.text`)}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section labelledBy="faq-title">
        <Container narrow className="flex flex-col gap-6">
          <h2 id="faq-title" className="t-h2">
            {t("faqTitle")}
          </h2>
          <div className="flex flex-col border-t border-line">
            {questions.map((question) => (
              <details key={question} className="group border-b border-line">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
                  {t(`faq.${question}.q`)}
                  <span
                    aria-hidden="true"
                    className="t-data text-fg-muted group-open:rotate-45 transition-transform duration-[120ms]"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-4 text-fg-muted">{t(`faq.${question}.a`)}</p>
              </details>
            ))}
          </div>
        </Container>
      </Section>

      <Section bordered>
        <Container className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="t-h2">{t("finalTitle")}</h2>
            <p className="text-fg-muted">{t("finalText")}</p>
          </div>
          {cta}
        </Container>
      </Section>
    </main>
  );
}
