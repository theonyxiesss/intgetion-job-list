import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { flags } from "@/config/flags";
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
  const form = (
    <HireForm
      companyId={company?.id ?? null}
      companyName={company?.name ?? ""}
      logoSrc={company ? companyLogoSrc(company.slug, company.logoPath) : null}
      publishes={hirePublishesNow(user.platformRole)}
      text={t.raw("form")}
      categories={options.categories}
      employment={options.employment}
      sharedDraft={sharedDraft}
    />
  );
  // v2 (UI_V2): the «New job» mockup — Spoki card, form card, publish card.
  if (flags.uiV2Enabled) {
    return (
      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto grid max-w-[1180px] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            <header className="flex flex-wrap items-center gap-3">
              <h1 className="mr-auto text-[22px] font-semibold tracking-tight">
                {t("v2.title")}
              </h1>
              <Link
                href="/employer/jobs"
                className="flex min-h-10 items-center rounded-xl border border-line-strong px-3.5 text-sm hover:bg-surface"
              >
                {t("v2.myJobs")}
              </Link>
            </header>
            <section className="flex flex-wrap items-center gap-3 rounded-[18px] border border-line bg-surface p-4">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full bg-accent"
              />
              <p className="min-w-0 flex-[1_1_320px] text-sm">
                {t("v2.spokiText")}
              </p>
              <Link
                href="/chat?from=post_job"
                className="flex min-h-10 items-center rounded-xl border border-line-strong px-3.5 text-sm font-medium hover:bg-surface-2"
              >
                {t("v2.spokiFill")}
              </Link>
            </section>
            <div className="rounded-[18px] border border-line bg-surface p-5 [&_.t-label]:text-sm [&_.t-label]:font-medium [&_.t-label]:tracking-normal [&_.t-label]:normal-case [&_.t-label]:font-sans [&_h2]:text-[15px] [&_h2]:font-semibold [&_.t-h3]:text-[15px] [&_.t-h2]:text-[15px] [&_input]:bg-surface-2 [&_select]:bg-surface-2 [&_textarea]:bg-surface-2">
              {form}
            </div>
          </div>
          <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
            <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4">
              <h2 className="text-[15px] font-semibold">
                {t("v2.publishTitle")}
              </h2>
              <p className="text-sm text-fg-muted">{t("v2.publishText")}</p>
              <Link
                href="/pricing"
                className="flex min-h-10 items-center justify-center rounded-xl border border-line-strong text-sm font-medium hover:bg-surface-2"
              >
                {t("v2.comparePlans")}
              </Link>
            </section>
          </aside>
        </div>
      </main>
    );
  }
  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        <ButtonLink
          href="/chat?from=post_job"
          variant="secondary"
          className="in-data-[ui=v2]:self-start in-data-[ui=v2]:rounded-xl"
        >
          {t("assistantDraft")}
        </ButtonLink>
        {form}
      </Container>
    </main>
  );
}
