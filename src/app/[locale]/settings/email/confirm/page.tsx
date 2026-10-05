import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { ConfirmEmail } from "@/components/settings/confirm-email";

export const dynamic = "force-dynamic";

/**
 * The link from the "add email" mail (D231). Opening it only shows a
 * button; the email changes on the click.
 */
export default async function ConfirmEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settings.email");
  const { token } = await searchParams;

  return (
    <AuthPage title={t("confirmTitle")}>
      {token ? (
        <ConfirmEmail token={token} />
      ) : (
        <p role="alert">{t("errors.invalid_link")}</p>
      )}
    </AuthPage>
  );
}
