import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { navBack } from "@/components/ui/page-transition";
import { Stat, StatRow } from "@/components/ui/stat";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import { publicHttpUrl } from "@/lib/company-mark";
import { HttpError } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import type { FreelanceOrderStatus } from "@/config/freelance";
import {
  canLeaveReview,
  getOrderView,
  getRoomFeed,
  orderPayState,
} from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";
import { ReportForm } from "@/modules/freelance/ui/report-form";
import { OrderActions, ReviewForm } from "@/modules/freelance/ui/order-actions";
import { OrderRoom } from "@/modules/freelance/ui/order-room";
import {
  freelanceClientCopy,
  orderRoomCopy,
  userOrLogin,
} from "@/modules/freelance/ui/server-copy";

/** The main path of an order, shown as steps (TZ 45 §4). */
const STEPS: readonly FreelanceOrderStatus[] = [
  "sent",
  "accepted",
  "in_progress",
  "delivered",
  "completed",
];

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freelance.orders" });
  return { title: t("one"), robots: { index: false } };
}

/** One order as one of its two sides sees it (28.4–28.7). */
export default async function FreelanceOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await userOrLogin(locale);
  let order;
  try {
    order = await getOrderView(user.id, id, clientIp(await headers()));
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const t = await getTranslations("freelance");
  const copy = await freelanceClientCopy(locale);
  const roomCopy = await orderRoomCopy(locale);
  const canReview = canLeaveReview(order);
  const deliveryHref = publicHttpUrl(order.deliveryUrl);
  const contact = order.counterpart;
  const payState = await orderPayState(user.id, order.id);
  const feed = await getRoomFeed(user.id, order.id);
  const stepIndex = STEPS.indexOf(order.status);

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <Link
          href={
            order.side === "buyer"
              ? "/freelance/orders"
              : "/freelance/orders?side=seller"
          }
          {...navBack}
          className="t-label inline-flex min-h-11 items-center self-start text-fg-muted"
        >
          {t("orders.back")}
        </Link>
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={order.next.length > 0 ? "new" : "neutral"}>
              {t(`orders.status.${order.status}`)}
            </Badge>
            <p className="t-label text-fg-muted">
              {order.side === "buyer"
                ? t("orders.youBuy")
                : t("orders.youSell")}
            </p>
          </div>
          <h1 className="t-h2">
            {order.serviceSlug ? (
              <Link
                href={`/freelance/${order.serviceSlug}`}
                className="underline-offset-4 hover:underline"
              >
                {order.serviceTitle}
              </Link>
            ) : (
              order.serviceTitle
            )}
          </h1>
          <p className="text-fg-muted">
            {t(`orders.hint.${order.side}.${order.status}`)}
          </p>
        </header>
        <StatRow>
          <Stat
            label={t("orders.package")}
            value={t(`tiers.${order.packageTier}`)}
          />
          <Stat
            label={t("priceLabel")}
            value={formatUsd(order.priceMinor, locale)}
          />
          <Stat
            label={t("termLabel")}
            value={t("days", { count: order.deliveryDays })}
          />
          <Stat
            label={t("orders.revisionsLeft")}
            value={String(order.revisionsLeft)}
          />
        </StatRow>
        {stepIndex >= 0 ? (
          <nav aria-label={roomCopy.room_steps}>
            <ol className="flex flex-wrap gap-x-4 gap-y-2">
              {STEPS.map((step, index) => (
                <li
                  key={step}
                  aria-current={index === stepIndex ? "step" : undefined}
                  className={
                    index === stepIndex
                      ? "t-body-s flex items-center gap-2 text-fg"
                      : "t-body-s flex items-center gap-2 text-fg-muted"
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      index <= stepIndex
                        ? "size-1.5 rounded-full bg-accent"
                        : "size-1.5 rounded-full border border-line-strong"
                    }
                  />
                  {t(`orders.status.${step}`)}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
          <aside
            aria-label={roomCopy.room_details}
            className="flex flex-col gap-8 lg:col-start-2 lg:row-start-1"
          >
            <section className="flex flex-col gap-2">
              <h2 className="t-h3">{t("orders.task")}</h2>
              <p className="max-w-[68ch] whitespace-pre-wrap">{order.task}</p>
              {order.wantedBy ? (
                <p className="t-body-s text-fg-muted">
                  {t("orders.wantedBy", { when: order.wantedBy })}
                </p>
              ) : null}
              {order.buyerCompany ? (
                <p className="t-body-s text-fg-muted">
                  {t("orders.fromCompany", { company: order.buyerCompany })}
                </p>
              ) : null}
            </section>
            {deliveryHref ? (
              <section className="flex flex-col gap-2">
                <h2 className="t-h3">{t("orders.result")}</h2>
                <a
                  href={deliveryHref}
                  rel="noopener noreferrer nofollow ugc"
                  className="t-data self-start underline underline-offset-4"
                >
                  {new URL(deliveryHref).host}
                </a>
              </section>
            ) : null}
            <section className="flex flex-col gap-3 rounded-lg border border-line p-4 md:p-6">
              <h2 className="t-h3">{t("orders.contacts")}</h2>
              {contact ? (
                <dl className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                  {contact.name ? (
                    <>
                      <dt className="t-label text-fg-muted">
                        {t("orders.contactName")}
                      </dt>
                      <dd>{contact.name}</dd>
                    </>
                  ) : null}
                  {contact.company ? (
                    <>
                      <dt className="t-label text-fg-muted">
                        {t("orders.contactCompany")}
                      </dt>
                      <dd>{contact.company}</dd>
                    </>
                  ) : null}
                  {contact.email ? (
                    <>
                      <dt className="t-label text-fg-muted">
                        {t("orders.contactEmail")}
                      </dt>
                      <dd className="t-data break-all">
                        <a
                          href={`mailto:${contact.email}`}
                          className="underline underline-offset-4"
                        >
                          {contact.email}
                        </a>
                      </dd>
                    </>
                  ) : null}
                  {contact.telegram ? (
                    <>
                      <dt className="t-label text-fg-muted">
                        {t("orders.contactTelegram")}
                      </dt>
                      <dd className="t-data break-all">{contact.telegram}</dd>
                    </>
                  ) : null}
                  {contact.phone ? (
                    <>
                      <dt className="t-label text-fg-muted">
                        {t("orders.contactPhone")}
                      </dt>
                      <dd className="t-data">{contact.phone}</dd>
                    </>
                  ) : null}
                  {contact.linkedinUrl ? (
                    <>
                      <dt className="t-label text-fg-muted">
                        {t("orders.contactLinkedin")}
                      </dt>
                      <dd className="t-data break-all">
                        {contact.linkedinUrl}
                      </dd>
                    </>
                  ) : null}
                </dl>
              ) : (
                <p className="text-fg-muted">{t("orders.contactsClosed")}</p>
              )}
            </section>
            {payState.payment?.status === "paid" ? (
              <p className="t-body-s text-success">{t("pay.paidLine")}</p>
            ) : payState.payable ? (
              <section className="flex flex-col gap-2 rounded-lg border border-line p-4">
                <p className="t-body-s text-fg-muted">{t("pay.orderText")}</p>
                <Link
                  href={`/billing/crypto?freelance=${order.id}`}
                  className={buttonClass("primary")}
                >
                  {t("pay.payButton", {
                    price: formatUsd(order.priceMinor, locale),
                  })}
                </Link>
              </section>
            ) : order.side === "buyer" &&
              order.status === "accepted" &&
              !payState.payoutReady ? (
              <p className="t-body-s text-fg-muted">{t("pay.payoutMissing")}</p>
            ) : null}
            {order.next.length > 0 ? (
              <section className="flex flex-col gap-3">
                <OrderActions
                  orderId={order.id}
                  status={order.status}
                  next={order.next}
                  copy={copy}
                />
              </section>
            ) : null}
            {canReview ? <ReviewForm orderId={order.id} copy={copy} /> : null}
            {order.reviewed ? (
              <p className="t-body-s text-fg-muted">{t("orders.reviewLeft")}</p>
            ) : null}
            <Link
              href={`/chat?order=${order.id}`}
              className="t-body-s inline-flex min-h-6 items-center self-start underline underline-offset-4"
            >
              {t("askSpoki")}
            </Link>
            <ReportForm kind="orders" id={order.id} copy={copy} />
            <p className="t-body-s text-fg-muted">{t("payNote")}</p>
          </aside>
          <div className="lg:col-start-1 lg:row-start-1">
            <OrderRoom
              orderId={order.id}
              locale={intlLocale(locale)}
              initial={feed}
              copy={roomCopy}
            />
          </div>
        </div>
      </Container>
    </main>
  );
}
