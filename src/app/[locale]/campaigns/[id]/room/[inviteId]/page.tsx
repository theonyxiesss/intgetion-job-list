import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { RouteMessages } from "@/components/shell/route-messages";
import { HttpError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMinor } from "@/lib/money";
import { getCurrentUser } from "@/modules/auth/service";
import {
  getUgcRoom,
  markUgcRoomRead,
  orderMoneyHistory,
  videoEmbedUrl,
} from "@/modules/ugc/service";
import { DeliveryPanel } from "@/modules/ugc/ui/delivery-panel";
import { DisputePanel } from "@/modules/ugc/ui/dispute-panel";
import { ReportMessage } from "@/modules/ugc/ui/report-message";
import { RoomForm } from "@/modules/ugc/ui/room-form";
import { RoomTabs } from "@/modules/ugc/ui/room-tabs";

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
  await markUgcRoomRead(user.id, inviteId);
  const money = await orderMoneyHistory(user.id, inviteId);
  const stamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const video = room.video;
  const orderSection = (
    <>
      {!room.ready ? (
        <p role="status" className="t-body-s text-fg-muted">
          {t("roomNotReady")}
        </p>
      ) : null}
      <DisputePanel
        inviteId={inviteId}
        dispute={room.dispute}
        canOpen={room.canOpenDispute}
      />
      {money.length > 0 ? (
        <section
          aria-labelledby="money-title"
          className="flex flex-col gap-2 rounded-lg border border-line p-4"
        >
          <h2 id="money-title" className="t-h4">
            {t("moneyHistoryTitle")}
          </h2>
          <ol className="t-body-s flex flex-col gap-1">
            {money.map((event) => (
              <li key={`${event.kind}-${event.at}`}>
                <time dateTime={event.at} className="font-mono">
                  {stamp.format(new Date(event.at))}
                </time>
                {" · "}
                {t(`moneyEvent.${event.kind}`)}
                {" · "}
                <span className="font-mono">
                  {formatMinor(BigInt(event.amountMinor), "USD", locale, {
                    wholeWhenEven: true,
                  })}
                </span>
              </li>
            ))}
          </ol>
          <p className="t-body-s text-fg-muted">{t("moneyHistoryNote")}</p>
        </section>
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
    </>
  );
  const materialsSection = (
    <section
      aria-labelledby="video-title"
      className="flex flex-col gap-3 rounded-lg border border-line p-4"
    >
      <h2 id="video-title" className="t-h4">
        {t("roomVideoTitle")}
      </h2>
      {video ? (
        <>
          {videoEmbedUrl(video.submission.url) ? (
            <iframe
              src={videoEmbedUrl(video.submission.url) ?? undefined}
              title={t("roomVideoTitle")}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="aspect-[9/16] w-full max-w-xs rounded-lg border border-line"
            />
          ) : null}
          <p className="break-all font-mono text-sm">{video.submission.url}</p>
          <ButtonLink
            href={video.submission.url}
            variant="secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("roomVideoOpen")}
          </ButtonLink>
          {video.versions.length > 0 ? (
            <ol className="t-body-s flex flex-col gap-1">
              {video.versions.map((version) => (
                <li key={version.version} className="break-all">
                  <span className="font-medium">
                    {t("roomVideoVersion", { version: version.version })}
                  </span>
                  {" · "}
                  <time dateTime={version.at} className="font-mono">
                    {stamp.format(new Date(version.at))}
                  </time>
                  {version.url === video.submission.url
                    ? ` · ${t("roomVideoLatest")}`
                    : null}
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : (
        <p className="t-body-s text-fg-muted">{t("roomVideoEmpty")}</p>
      )}
    </section>
  );
  const discussionSection = (
    <>
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
                      video_sent: "roomEventVideoSent",
                      decided: "roomEventDecided",
                      shipped: "roomEventShipped",
                      received: "roomEventReceived",
                      problem: "roomEventProblem",
                      dispute_opened: "roomEventDisputeOpened",
                      dispute_resolved: "roomEventDisputeResolved",
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
    </>
  );
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
          <RoomTabs
            label={t("roomTitle")}
            sections={[
              {
                key: "order",
                title: t("roomTabOrder"),
                content: orderSection,
              },
              {
                key: "materials",
                title: t("roomTabMaterials"),
                content: materialsSection,
              },
              {
                key: "discussion",
                title: t("roomTabDiscussion"),
                content: discussionSection,
                badge: room.unread,
              },
            ]}
          />
        </Container>
      </main>
    </RouteMessages>
  );
}
