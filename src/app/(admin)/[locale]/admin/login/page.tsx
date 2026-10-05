import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Container, PageHeader } from "@/components/ui";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <main className="flex flex-1 py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader
          label={t("title")}
          title={t("loginTitle")}
          intro={t("loginIntro")}
        />
        <AdminLoginForm failed={t("loginFailed")} />
      </Container>
    </main>
  );
}
