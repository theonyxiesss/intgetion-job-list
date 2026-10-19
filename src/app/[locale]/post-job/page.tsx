import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { companyLogoSrc } from "@/lib/company-mark";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { hirePublishesNow } from "@/modules/jobs/schemas/hire";
import { HireForm } from "@/modules/jobs/ui/hire-form";
import { jobFormOptions } from "../employer/jobs/form-options";
import { readJobDraft } from "@/modules/jobs/service";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Public hire form (D391). A signed-in person fills one page and the job
 * waits for an admin. A guest is asked to sign in first.
 */
export default async function PostJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { locale } = await params;
  const { draft: draftId } = await searchParams;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const t = await getTranslations("postJob");
  if (!user) {
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

  const company = (await getCompaniesForUser(user.id)).find(
    (item) =>
      item.origin === "internal" &&
      ["owner", "admin", "recruiter"].includes(item.role),
  );
  const sharedDraft =
    draftId && UUID.test(draftId)
      ? await readJobDraft(user.id, draftId).catch(() => undefined)
      : undefined;
  const options = await jobFormOptions();
  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        <ButtonLink href="/chat?from=post_job" variant="secondary">
          {t("assistantDraft")}
        </ButtonLink>
        <HireForm
          companyId={company?.id ?? null}
          companyName={company?.name ?? ""}
          logoSrc={
            company ? companyLogoSrc(company.slug, company.logoPath) : null
          }
          publishes={hirePublishesNow(user.platformRole)}
          text={t.raw("form")}
          categories={options.categories}
          employment={options.employment}
          sharedDraft={sharedDraft}
        />
      </Container>
    </main>
  );
}
