import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthPage } from "@/components/auth/auth-page";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";

/**
 * «Post a job» from the header (D347). Nobody has a stored plan yet, so a
 * signed-in person sees the company tariffs first. The free card continues
 * to the existing form. A guest is asked to sign in.
 */
export default async function PostJobPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (user) {
    redirect({
      href: { pathname: "/pricing", query: { for: "companies", next: "post" } },
      locale,
    });
  }

  const t = await getTranslations("postJob");
  const auth = await getTranslations("auth");
  return (
    <AuthPage
      title={t("title")}
      footer={
        <p>
          {auth("noAccount")}{" "}
          <Link href="/register" className="underline underline-offset-4">
            {t("register")}
          </Link>
        </p>
      }
    >
      <p className="max-w-[60ch]">{t("guest")}</p>
      <ButtonLink href={{ pathname: "/login", query: { next: "post-job" } }}>
        {auth("toLogin")}
      </ButtonLink>
    </AuthPage>
  );
}
