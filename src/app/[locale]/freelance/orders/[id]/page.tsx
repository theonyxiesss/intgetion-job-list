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
import { flags } from "@/config/flags";
import {
  canLeaveReview,
  getClientReviewView,
  getOrderView,
  orderDeadline,
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
import { RichText } from "@/components/ui/rich-text";

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
  const clientReview = await getClientReviewView(user.id, order.id);
  const ratingFormat = new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const stepIndex = STEPS.indexOf(order.status);
  const deadline = orderDeadline(order, new Date());
  // v2 (UI_V2): the order-room mockup — header card with a progress bar,
  // the room on the left, the order details as cards on the right.
  const v2 = flags.uiV2Enabled;
  const card = v2
    ? "flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-5"
    : null;

  return (
    <main className={v2 ? "px-4 py-6 md:px-6 md:py-8" : "py-10 md:py-16"}>
      <Container
        className={
          v2
            ? "!mx-auto !max-w-[1180px] !px-0 flex flex-col gap-4"
            : "flex flex-col gap-8"
        }
      >
        <Link
          href={
            order.side === "buyer"
              ? "/freelance/orders"
              : "/freelance/orders?side=seller"
          }
          {...navBack}
          className={
            v2
              ? "inline-flex min-h-9 items-center gap-1.5 self-start text-sm text-fg-muted hover:text-fg"
              : "t-label inline-flex min-h-11 items-center self-start text-fg-muted"
          }
        >
          {t("orders.back")}
        </Link>
        <header className={card ?? "flex flex-col gap-3"}>
          {v2 ? (
            <p className="text-xs text-fg-subtle">
              {t("v2.room")} · #{order.id.slice(0, 4).toUpperCase()} ·{" "}
              {t(`orders.status.${order.status}`)}
            </p>
          ) : null}
          <div className={v2 ? "hidden" : "flex flex-wrap items-center gap-2"}>
            <Badge tone={order.next.length > 0 ? "new" : "neutral"}>
              {t(`orders.status.${order.status}`)}
            </Badge>
            <p className="t-label text-fg-muted">
              {order.side === "buyer"
                ? t("orders.youBuy")
                : t("orders.youSell")}
            </p>
          </div>
          <h1
            className={v2 ? "text-[22px] font-semibold tracking-tight" : "t-h2"}
          >
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
          {v2 ? (
            <p className="text-sm text-fg-muted">
              {[
                contact?.name
                  ? `${order.side === "buyer" ? t("v2.seller") : t("v2.buyer")} ${contact.name}`
                  : null,
                order.side === "buyer" ? t("v2.youBuy") : t("v2.youSell"),
                deadline
                  ? t("v2.due", {
                      date: deadline.dueAt.toISOString().slice(0, 10),
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          <p className={v2 ? "text-sm text-fg-subtle" : "text-fg-muted"}>
            {t(`orders.hint.${order.side}.${order.status}`)}
          </p>
          {v2 && stepIndex >= 0 ? (
            <nav aria-label={roomCopy.room_steps} className="pt-2">
              <ol className="grid grid-cols-5 gap-1.5">
                {STEPS.map((step, index) => (
                  <li
                    key={step}
                    aria-current={index === stepIndex ? "step" : undefined}
                    className="flex min-w-0 flex-col gap-1.5"
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1 rounded-full ${index <= stepIndex ? "bg-accent" : "bg-line-strong"}`}
                    />
                    <span
                      className={`truncate text-xs ${index === stepIndex ? "font-medium text-fg" : "text-fg-subtle"}`}
                    >
                      {t(`orders.status.${step}`)}
                    </span>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
        </header>
        {v2 ? null : (
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
        )}
        {deadline && (!v2 || deadline.state === "overdue") ? (
          <p
            role={deadline.state === "overdue" ? "alert" : "status"}
            className={
              v2
                ? `self-start rounded-lg px-3 py-1.5 text-sm ${deadline.state === "overdue" ? "bg-danger/15 text-danger" : "bg-surface-2 text-fg-muted"}`
                : "t-body-s font-mono"
            }
          >
            {t(`orders.deadline.${deadline.state}`, {
              date: deadline.dueAt.toISOString().slice(0, 10),
            })}
          </p>
        ) : null}
        {!v2 && stepIndex >= 0 ? (
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
        <div
          className={
            v2
              ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start"
              : "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start"
          }
        >
          <aside
            aria-label={roomCopy.room_details}
            className={
              v2
                ? "flex flex-col gap-3 lg:col-start-2 lg:row-start-1 [&_.t-label]:font-sans [&_.t-label]:text-xs [&_.t-label]:tracking-normal [&_.t-label]:normal-case"
                : "flex flex-col gap-8 lg:col-start-2 lg:row-start-1"
            }
          >
            {v2 ? (
              <section className="flex flex-col gap-2 rounded-[18px] border border-line bg-surface p-5">
                <span className="text-xs text-fg-subtle">
                  {t("priceLabel")}
                </span>
                <span className="text-[30px] leading-none font-semibold tracking-tight">
                  {formatUsd(order.priceMinor, locale)}
                </span>
                <span className="text-sm text-fg-muted">
                  {[
                    t(`tiers.${order.packageTier}`),
                    t("days", { count: order.deliveryDays }),
                    `${t("orders.revisionsLeft")}: ${order.revisionsLeft}`,
                  ].join(" · ")}
                </span>
              </section>
            ) : null}
            <section className={card ?? "flex flex-col gap-2"}>
              <h2 className={v2 ? "text-[15px] font-semibold" : "t-h3"}>
                {t("orders.task")}
              </h2>
              <RichText text={order.task} className="" />
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
              <section className={card ?? "flex flex-col gap-2"}>
                <h2 className={v2 ? "text-[15px] font-semibold" : "t-h3"}>
                  {t("orders.result")}
                </h2>
                <a
                  href={deliveryHref}
                  rel="noopener noreferrer nofollow ugc"
                  className="t-data self-start underline underline-offset-4"
                >
                  {new URL(deliveryHref).host}
                </a>
              </section>
            ) : null}
            <section
              className={
                card ??
                "flex flex-col gap-3 rounded-lg border border-line p-4 md:p-6"
              }
            >
              <h2 className={v2 ? "text-[15px] font-semibold" : "t-h3"}>
                {t("orders.contacts")}
              </h2>
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
              <section
                className={
                  card ??
                  "flex flex-col gap-2 rounded-lg border border-line p-4"
                }
              >
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
            {order.side === "seller" && clientReview.ready ? (
              <p className="t-body-s text-fg-muted">
                {clientReview.summary
                  ? t("orders.clientRating", {
                      rating: ratingFormat.format(clientReview.summary.average),
                      count: clientReview.summary.count,
                    })
                  : t("orders.clientRatingNone")}
              </p>
            ) : null}
            {clientReview.canReview ? (
              <ReviewForm orderId={order.id} copy={copy} about="client" />
            ) : null}
            {clientReview.reviewed ? (
              <p className="t-body-s text-fg-muted">
                {t("orders.clientReviewed")}
              </p>
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
          <div
            className={
              v2
                ? "min-w-0 rounded-[18px] border border-line bg-surface p-4 lg:col-start-1 lg:row-start-1 [&_.t-label]:font-sans [&_.t-label]:text-xs [&_.t-label]:tracking-normal [&_.t-label]:normal-case"
                : "lg:col-start-1 lg:row-start-1"
            }
          >
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
