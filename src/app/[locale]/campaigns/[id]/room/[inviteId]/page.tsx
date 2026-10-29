import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { RouteMessages } from "@/components/shell/route-messages";
import { HttpError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getUgcRoom } from "@/modules/ugc/service";
import { DeliveryPanel } from "@/modules/ugc/ui/delivery-panel";
import { ReportMessage } from "@/modules/ugc/ui/report-message";
import { RoomForm } from "@/modules/ugc/ui/room-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("roomTitle"), robots: { index: false, follow: false } };
}

export default async function UgcRoomPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; inviteId: string }>;
}) {
  const { locale, id, inviteId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ugc");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) notFound();
  let room;
  try {
    room = await getUgcRoom(user.id, inviteId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const stamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <RouteMessages namespaces={["ugc"]}>
      <main className="py-10 md:py-16">
        <Container className="flex max-w-3xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="t-h2">{t("roomTitle")}</h1>
            <ButtonLink href={`/campaigns/${id}`} variant="secondary">
              {t("roomBack")}
            </ButtonLink>
          </div>
          {!room.ready ? (
            <p role="status" className="t-body-s text-fg-muted">
              {t("roomNotReady")}
            </p>
          ) : null}
          {room.shipment || room.canShip ? (
            <DeliveryPanel
              inviteId={inviteId}
              shipment={room.shipment}
              canShip={room.canShip}
              canConfirmReceipt={room.canConfirmReceipt}
              canReportProblem={room.canReportProblem}
            />
          ) : null}
          {room.items.length === 0 ? (
            <p className="text-fg-muted">{t("roomEmpty")}</p>
          ) : (
            <ol className="flex flex-col gap-3" aria-label={t("roomTitle")}>
              {room.items.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="rounded-lg border border-line p-4"
                >
                  {item.kind === "event" ? (
                    <p className="t-body-s text-fg-muted">
                      {t(
                        {
                          offered: "roomEventOffered",
                          agreed: "roomEventAgreed",
                          shipped: "roomEventShipped",
                          received: "roomEventReceived",
                          problem: "roomEventProblem",
                        }[item.event],
                      )}{" "}
                      <time dateTime={item.at} className="font-mono">
                        {stamp.format(new Date(item.at))}
                      </time>
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="t-body-s text-fg-muted">
                        <span className="font-medium text-fg">
                          {item.mine
                            ? t("roomMine")
                            : item.side === "deleted"
                              ? t("roomDeleted")
                              : t(
                                  item.side === "company"
                                    ? "roomSideCompany"
                                    : "roomSideCreator",
                                )}
                        </span>{" "}
                        <time dateTime={item.at} className="font-mono">
                          {stamp.format(new Date(item.at))}
                        </time>
                      </p>
                      <p className="break-words whitespace-pre-wrap">
                        {item.hidden ? t("roomHidden") : item.body}
                      </p>
                      {!item.mine && !item.hidden ? (
                        <ReportMessage messageId={item.id} />
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          {room.writable ? (
            <RoomForm inviteId={inviteId} />
          ) : room.ready ? (
            <p className="t-body-s text-fg-muted">{t("roomClosed")}</p>
          ) : null}
        </Container>
      </main>
    </RouteMessages>
  );
}
