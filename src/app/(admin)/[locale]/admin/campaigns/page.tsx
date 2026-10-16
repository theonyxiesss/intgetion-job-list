import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { requireAdminPage } from "@/components/admin/admin-page";
import { formatMinor } from "@/lib/money";
import { listOwedPayouts, listReviewQueue } from "@/modules/ugc/service";
import { UgcAction } from "@/modules/ugc/ui/action";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("ugc");
  const rows = await listReviewQueue(true);
  const owed = await listOwedPayouts(true);
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-6">
        <PageHeader title={t("adminTitle")} />
        {rows.length === 0 ? (
          <p className="text-fg-muted">{t("adminEmpty")}</p>
        ) : null}
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-line p-4">
              <p className="font-medium">{row.productName}</p>
              <p className="t-body-s mt-1 max-w-[60ch]">{row.productSummary}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <UgcAction
                  action="moderate"
                  label={t("approve")}
                  body={{ campaignId: row.id, to: "open" }}
                  primary
                />
                <UgcAction
                  action="moderate"
                  label={t("reject")}
                  body={{ campaignId: row.id, to: "rejected" }}
                />
              </div>
            </li>
          ))}
        </ul>
        <h2 className="font-medium">{t("payoutsTitle")}</h2>
        {owed.length === 0 ? (
          <p className="text-fg-muted">{t("payoutsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {owed.map((row) => (
              <li key={row.id} className="rounded-lg border border-line p-4">
                <p className="font-medium">{row.productName}</p>
                <p className="t-body-s">{row.displayName || t("creator")}</p>
                <p className="t-body-s mt-2">
                  {t("owedNote", {
                    amount: formatMinor(
                      BigInt(row.amountMinor),
                      "USD",
                      locale,
                      {
                        wholeWhenEven: true,
                      },
                    ),
                  })}
                </p>
                <UgcAction
                  action="markPaid"
                  label={t("markPaid")}
                  body={{ payoutId: row.id }}
                  primary
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
