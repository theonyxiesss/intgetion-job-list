import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import {
  RequestResetForm,
  UpdatePasswordForm,
} from "@/components/auth/reset-forms";
import { Link } from "@/i18n/navigation";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { mode } = await searchParams;
  const updating = mode === "update";

  return (
    <AuthPage
      title={updating ? t("updatePasswordTitle") : t("resetTitle")}
      footer={
        <Link href="/login" className="underline underline-offset-4">
          {t("toLogin")}
        </Link>
      }
    >
      {updating ? <UpdatePasswordForm /> : <RequestResetForm />}
    </AuthPage>
  );
}
