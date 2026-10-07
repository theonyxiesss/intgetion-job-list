import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { EmailConfirmedNotify } from "@/components/auth/email-confirmed-notify";

export const dynamic = "force-dynamic";

/**
 * Shown on the device that opened the email link when another browser is
 * waiting (usually phone confirms, PC continues) — D328.
 */
export default async function SignedInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { kind } = await searchParams;
  const signup = kind === "signup";

  return (
    <AuthPage title={signup ? t("confirmedTitle") : t("signedInTitle")}>
      <EmailConfirmedNotify />
      <p>{signup ? t("signedInSignupBody") : t("signedInLoginBody")}</p>
    </AuthPage>
  );
}
