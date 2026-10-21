import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { HttpError } from "@/lib/http";
import { formatMinor } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listWinners } from "@/modules/ugc/service";
import { DeskEmpty, DeskShell, Monogram } from "@/modules/ugc/ui/desk";

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
  const d = await getTranslations("ugcDesk");
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
    <DeskShell
      active="materials"
      title={view.productName}
      intro={t("winnersIntro")}
      actions={
        <ButtonLink href={`/campaigns/${id}`} variant="secondary">
          {d("backToBrief")}
        </ButtonLink>
      }
    >
      {view.winners.length === 0 ? (
        <DeskEmpty title={t("winnersEmpty")} />
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {view.winners.map((row) => {
            const name = row.displayName || t("creator");
            return (
              <li
                key={row.inviteId}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start md:px-5"
              >
                <Monogram name={name} />
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="font-medium break-words">{name}</p>
                  {row.rights ? (
                    <p className="t-body-s text-fg-muted">
                      {t(`rights.${row.rights}`)}
                    </p>
                  ) : null}
                  {row.liveUrl ? (
                    <a
                      href={row.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="t-body-s break-all underline underline-offset-4"
                    >
                      {row.liveUrl}
                      <span className="sr-only">{d("newTab")}</span>
                    </a>
                  ) : (
                    <p className="t-body-s text-fg-muted">
                      {t("winnersNoCount")}
                    </p>
                  )}
                  {row.reportedViews != null ? (
                    <p className="t-body-s font-mono">
                      {t("reportedViews", { count: row.reportedViews })}
                    </p>
                  ) : null}
                  {row.payout ? (
                    <p className="t-body-s">
                      {t(
                        row.payout.status === "paid" ? "paidNote" : "owedNote",
                        {
                          amount: formatMinor(
                            BigInt(row.payout.amountMinor),
                            "USD",
                            locale,
                            { wholeWhenEven: true },
                          ),
                        },
                      )}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DeskShell>
  );
}
