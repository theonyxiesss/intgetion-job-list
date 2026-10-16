import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FREELANCE_LIMITS } from "@/config/freelance";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { navForward } from "@/components/ui/page-transition";
import { Link } from "@/i18n/navigation";
import { hasCandidateProfile } from "@/modules/candidates/service";
import {
  getPayoutStatus,
  getSeller,
  listOrders,
  listOwnServices,
} from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";
import { SellerSwitch } from "@/modules/freelance/ui/seller-switch";
import {
  freelanceClientCopy,
  userOrLogin,
} from "@/modules/freelance/ui/server-copy";
import { ServiceActions } from "@/modules/freelance/ui/service-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freelance.cabinet" });
  return { title: t("title"), robots: { index: false } };
}

const TONE = {
  draft: "neutral",
  pending: "pending",
  published: "success",
  paused: "neutral",
  rejected: "danger",
  removed: "danger",
} as const;

/** The freelancer's cabinet: taking orders, own services, new requests (28.2). */
export default async function FreelanceCabinetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await userOrLogin(locale);
  const t = await getTranslations("freelance");
  const profile = await hasCandidateProfile(user.id);
  const seller = profile ? await getSeller(user.id) : null;
  const services = seller ? await listOwnServices(user.id) : [];
  const incoming = seller
    ? (await listOrders(user.id, "seller")).filter(
        (order) => order.status === "sent",
      )
    : [];
  const copy = await freelanceClientCopy(locale);
  const payout = seller ? await getPayoutStatus(user.id) : null;
  const active = services.filter((service) =>
    ["pending", "published", "paused"].includes(service.status),
  ).length;

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader
          title={t("cabinet.title")}
          intro={t("cabinet.intro")}
          actions={
            <Link href="/freelance/orders" className={buttonClass("secondary")}>
              {t("cabinet.ordersLink")}
            </Link>
          }
        />
        {!profile ? (
          <EmptyState
            title={t("cabinet.needProfile")}
            text={t("cabinet.needProfileText")}
            action={
              <Link href="/profile/edit" className={buttonClass("primary")}>
                {t("cabinet.createProfile")}
              </Link>
            }
          />
        ) : (
          <>
            <section className="flex flex-col gap-3 rounded-lg border border-line p-4 md:p-6">
              <SellerSwitch
                accepting={seller?.accepting ?? false}
                copy={copy}
              />
              <p className="t-body-s text-fg-muted">
                {t("cabinet.acceptingNote")}
              </p>
            </section>
            {seller ? (
              <>
                <section className="flex flex-col gap-2 rounded-lg border border-line p-4 md:p-6">
                  <h2 className="t-h3">{t("pay.payoutTitle")}</h2>
                  {payout?.address ? (
                    <p className="font-mono text-sm break-all">
                      {payout.address}
                    </p>
                  ) : (
                    <p className="t-body-s text-fg-muted">
                      {t("pay.payoutNone")}
                    </p>
                  )}
                  <Link
                    href="/billing/crypto?payout=1"
                    className={`${buttonClass("secondary")} self-start`}
                  >
                    {payout?.address
                      ? t("pay.payoutChange")
                      : t("pay.payoutConfirm")}
                  </Link>
                </section>
                <section className="flex flex-col gap-4">
                  <h2 className="t-h3">{t("cabinet.incoming")}</h2>
                  {incoming.length === 0 ? (
                    <p className="text-fg-muted">{t("cabinet.noIncoming")}</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                      {incoming.map((order) => (
                        <li
                          key={order.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-4"
                        >
                          <div className="flex min-w-0 flex-col gap-1">
                            <p className="font-medium">{order.serviceTitle}</p>
                            <p className="t-data text-fg-muted">
                              {t(`tiers.${order.packageTier}`)} ·{" "}
                              {formatUsd(order.priceMinor, locale)}
                            </p>
                          </div>
                          <Link
                            href={`/freelance/orders/${order.id}`}
                            {...navForward}
                            className={buttonClass("primary")}
                          >
                            {t("cabinet.answer")}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="t-h3">{t("cabinet.myServices")}</h2>
                    <p className="t-data text-fg-muted">
                      {t("cabinet.limit", {
                        count: active,
                        max: FREELANCE_LIMITS.activeServicesMax,
                      })}
                    </p>
                  </div>
                  {services.length === 0 ? (
                    <p className="text-fg-muted">{t("cabinet.noServices")}</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {services.map((service) => (
                        <li
                          key={service.id}
                          className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={TONE[service.status]}>
                              {t(`cabinet.status.${service.status}`)}
                            </Badge>
                            <p className="t-data text-fg-muted">
                              {t("from", {
                                price: formatUsd(
                                  service.packages[0]?.priceMinor ?? BigInt(0),
                                  locale,
                                ),
                              })}
                            </p>
                          </div>
                          <p className="t-h3">
                            {service.status === "published" ? (
                              <Link
                                href={`/freelance/${service.slug}`}
                                className="underline-offset-4 hover:underline"
                              >
                                {service.title}
                              </Link>
                            ) : (
                              service.title
                            )}
                          </p>
                          {service.status === "rejected" &&
                          service.moderationNote ? (
                            <p className="t-body-s text-danger">
                              {t("cabinet.rejectedNote", {
                                note: service.moderationNote,
                              })}
                            </p>
                          ) : null}
                          {service.status === "pending" ? (
                            <p className="t-body-s text-fg-muted">
                              {t("cabinet.pendingNote")}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-start gap-2">
                            <ServiceActions
                              serviceId={service.id}
                              status={service.status}
                              copy={copy}
                            />
                            <Link
                              href={`/profile/freelance/${service.id}/edit`}
                              className={buttonClass("ghost")}
                            >
                              {t("cabinet.edit")}
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {active < FREELANCE_LIMITS.activeServicesMax ? (
                    <Link
                      href="/profile/freelance/new"
                      {...navForward}
                      className={`${buttonClass("primary")} self-start`}
                    >
                      {t("cabinet.newService")}
                    </Link>
                  ) : null}
                </section>
              </>
            ) : null}
          </>
        )}
      </Container>
    </main>
  );
}
