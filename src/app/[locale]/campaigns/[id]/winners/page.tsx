import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { HttpError } from "@/lib/http";
import { formatMinor } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listWinners } from "@/modules/ugc/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("winners"), robots: { index: false, follow: false } };
}

export default async function WinnersPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ugc");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) notFound();
  let view;
  try {
    view = await listWinners(user.id, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  return (
    <main className="py-10 md:py-16">
      <Container className="flex max-w-3xl flex-col gap-6">
        <PageHeader title={view.productName} intro={t("winnersIntro")} />
        <ButtonLink href={`/campaigns/${id}`} variant="secondary">
          {t("title")}
        </ButtonLink>
        {view.winners.length === 0 ? (
          <p className="t-body-s text-fg-muted">{t("winnersEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {view.winners.map((row) => (
              <li
                key={row.inviteId}
                className="rounded-lg border border-line p-4"
              >
                <p className="font-medium">{row.displayName || t("creator")}</p>
                {row.rights ? (
                  <p className="t-body-s text-fg-muted">
                    {t(`rights.${row.rights}`)}
                  </p>
                ) : null}
                {row.liveUrl ? (
                  <p className="t-body-s mt-2 break-all">{row.liveUrl}</p>
                ) : (
                  <p className="t-body-s mt-2 text-fg-muted">
                    {t("winnersNoCount")}
                  </p>
                )}
                {row.reportedViews != null ? (
                  <p className="t-body-s mt-2 font-mono">
                    {t("reportedViews", { count: row.reportedViews })}
                  </p>
                ) : null}
                {row.payout ? (
                  <p className="t-body-s mt-2">
                    {t(row.payout.status === "paid" ? "paidNote" : "owedNote", {
                      amount: formatMinor(
                        BigInt(row.payout.amountMinor),
                        "USD",
                        locale,
                        {
                          wholeWhenEven: true,
                        },
                      ),
                    })}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
