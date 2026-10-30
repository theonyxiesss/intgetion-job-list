import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { requireAdminPage } from "@/components/admin/admin-page";
import { HttpError } from "@/lib/http";
import { readDisputeRoom } from "@/modules/ugc/service";

/**
 * The talk of a disputed order for support (U4, TZ 48 §8). Reading it is
 * audited by the service; this page only shows what the service returns.
 */
export default async function AdminDisputeRoomPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const admin = await requireAdminPage();
  const t = await getTranslations("ugc");
  let room;
  try {
    room = await readDisputeRoom({
      adminId: admin.id,
      isAdmin: true,
      disputeId: id,
    });
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const stamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <main className="py-10 md:py-16">
      <Container className="flex max-w-3xl flex-col gap-6">
        <PageHeader title={t("roomTitle")} />
        <p className="t-body-s text-fg-muted">
          {t(`disputeWho.${room.dispute.side}`)} ·{" "}
          {t(`disputeReason.${room.dispute.reason}`)} ·{" "}
          {t(`disputeStatus.${room.dispute.status}`)}
        </p>
        {room.messages.length === 0 ? (
          <p className="text-fg-muted">{t("roomEmpty")}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {room.messages.map((row) => (
              <li key={row.id} className="rounded-lg border border-line p-4">
                <p className="t-body-s text-fg-muted">
                  <time dateTime={row.at} className="font-mono">
                    {stamp.format(new Date(row.at))}
                  </time>
                  {row.hidden ? ` · ${t("roomHidden")}` : null}
                </p>
                <p className="break-words whitespace-pre-wrap">{row.body}</p>
              </li>
            ))}
          </ol>
        )}
      </Container>
    </main>
  );
}
