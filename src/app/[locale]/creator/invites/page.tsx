import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listMyInvites } from "@/modules/ugc/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("invitesTitle"), robots: { index: false, follow: false } };
}

export default async function InvitesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ugc");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }
  const rows = await listMyInvites(user.id);
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-6">
        <PageHeader title={t("invitesTitle")} />
        {rows.length === 0 ? (
          <p className="text-fg-muted">{t("emptyInvites")}</p>
        ) : null}
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li
              key={row.inviteId}
              className="rounded-lg border border-line p-4"
            >
              <p className="font-medium">{row.productName}</p>
              <p className="t-body-s font-mono text-fg-muted">
                {t(`status.${row.status}`)}
              </p>
              <div className="mt-3">
                <ButtonLink
                  href={`/chat?invite=${row.inviteId}`}
                  variant="secondary"
                >
                  {t("thread")}
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
