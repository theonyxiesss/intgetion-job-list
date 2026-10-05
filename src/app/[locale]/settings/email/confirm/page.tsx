import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { Link } from "@/i18n/navigation";
import { confirmEmailAdd } from "@/modules/auth/service";

export const dynamic = "force-dynamic";

/** The link from the "add email" mail (D231). */
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
  const result = token
    ? await confirmEmailAdd(token)
    : ({ ok: false, reason: "invalid_link" } as const);

  return (
    <AuthPage title={t("confirmTitle")}>
      <p role={result.ok ? "status" : "alert"}>
        {result.ok ? t("confirmed") : t(`errors.${result.reason}`)}
      </p>
      <Link href="/settings/account" className="underline">
        {t("toAccount")}
      </Link>
    </AuthPage>
  );
}
