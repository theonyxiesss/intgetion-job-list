import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { navBack } from "@/components/ui/page-transition";
import { Stat, StatRow } from "@/components/ui/stat";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import { publicHttpUrl } from "@/lib/company-mark";
import { HttpError } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { canLeaveReview, getOrderView } from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";
import { OrderActions, ReviewForm } from "@/modules/freelance/ui/order-actions";
import {
  freelanceClientCopy,
  userOrLogin,
} from "@/modules/freelance/ui/server-copy";

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
  const dates = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const canReview = canLeaveReview(order);
  const deliveryHref = publicHttpUrl(order.deliveryUrl);
  const contact = order.counterpart;

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
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
                  <dd className="t-data break-all">{contact.linkedinUrl}</dd>
                </>
              ) : null}
            </dl>
          ) : (
            <p className="text-fg-muted">{t("orders.contactsClosed")}</p>
          )}
        </section>
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
        <section className="flex flex-col gap-2">
          <h2 className="t-label text-fg-muted">{t("orders.history")}</h2>
          <ol className="flex flex-col gap-1">
            {order.history.map((row) => (
              <li key={row.id} className="t-body-s flex flex-wrap gap-2">
                <time
                  className="t-data text-fg-muted"
                  dateTime={row.createdAt.toISOString()}
                >
                  {dates.format(row.createdAt)}
                </time>
                <span>{t(`orders.status.${row.toStatus}`)}</span>
              </li>
            ))}
          </ol>
        </section>
        <Link
          href={`/chat?order=${order.id}`}
          className="t-body-s underline underline-offset-4"
        >
          {t("askSpoki")}
        </Link>
        <p className="t-body-s text-fg-muted">{t("payNote")}</p>
      </Container>
    </main>
  );
}
