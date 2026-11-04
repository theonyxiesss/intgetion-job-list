import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { OrderCard } from "@/components/ui/order-card";
import { LinkTabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import {
  listOrders,
  orderDeadline,
  orderStage,
  type PartyOrder,
} from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";
import { userOrLogin } from "@/modules/freelance/ui/server-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freelance.orders" });
  return { title: t("title"), robots: { index: false } };
}

/** The date that matters now, by status (D603). */
function keyDate(
  order: PartyOrder,
  now: Date,
): { key: string; at: Date } | null {
  switch (order.status) {
    case "sent":
      return { key: "answerBy", at: order.expiresAt };
    case "accepted":
      return order.acceptedAt
        ? { key: "acceptedOn", at: order.acceptedAt }
        : null;
    case "in_progress": {
      const due = orderDeadline(order, now);
      return due ? { key: "dueBy", at: due.dueAt } : null;
    }
    case "delivered":
      return order.deliveredAt
        ? { key: "deliveredOn", at: order.deliveredAt }
        : null;
    case "completed":
      return order.completedAt
        ? { key: "completedOn", at: order.completedAt }
        : null;
    default:
      return { key: "closedOn", at: order.closedAt ?? order.updatedAt };
  }
}

/** Orders of the signed-in person, as buyer or as seller (28.4). */
export default async function FreelanceOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ side?: string }>;
}) {
  const { locale } = await params;
  const { side: rawSide } = await searchParams;
  setRequestLocale(locale);
  const user = await userOrLogin(locale);
  const side = rawSide === "seller" ? "seller" : "buyer";
  const t = await getTranslations("freelance");
  const card = await getTranslations("ui.orderCard");
  const orders = await listOrders(user.id, side);
  const now = new Date();
  const stepLabels = {
    accepted: card("steps.accepted"),
    work: card("steps.work"),
    review: card("steps.review"),
    done: card("steps.done"),
  };
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("orders.title")} intro={t("orders.intro")} />
        <LinkTabs
          label={t("orders.title")}
          items={[
            {
              label: t("orders.buying"),
              href: { pathname: "/freelance/orders" },
              active: side === "buyer",
            },
            {
              label: t("orders.selling"),
              href: {
                pathname: "/freelance/orders",
                query: { side: "seller" },
              },
              active: side === "seller",
            },
          ]}
        />
        {orders.length === 0 ? (
          <EmptyState
            title={
              side === "buyer"
                ? t("orders.emptyBuying")
                : t("orders.emptySelling")
            }
            action={
              <Link
                href={side === "buyer" ? "/freelance" : "/profile/freelance"}
                className="underline underline-offset-4"
              >
                {side === "buyer"
                  ? t("orders.toCatalog")
                  : t("orders.toCabinet")}
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => {
              const date = keyDate(order, now);
              return (
                <li key={order.id}>
                  <OrderCard
                    href={`/freelance/orders/${order.id}`}
                    icon="freelance"
                    code={`FR / ${order.id.slice(0, 4).toUpperCase()}`}
                    status={t(`orders.status.${order.status}`)}
                    stage={orderStage(order.status)}
                    stepLabels={stepLabels}
                    stepsLabel={card("stepsLabel")}
                    title={order.serviceTitle}
                    headingLevel={2}
                    subtitle={`${t(`tiers.${order.packageTier}`)} · ${t(
                      "days",
                      { count: order.deliveryDays },
                    )}`}
                    price={{
                      label: card("price"),
                      value: formatUsd(order.priceMinor, locale),
                    }}
                    date={
                      date
                        ? {
                            label: card(date.key),
                            value: (
                              <time dateTime={date.at.toISOString()}>
                                {dates.format(date.at)}
                              </time>
                            ),
                          }
                        : undefined
                    }
                    next={{
                      label: card("next"),
                      text: t(`orders.hint.${side}.${order.status}`),
                      open: card("open"),
                      yours: order.next.length > 0,
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </main>
  );
}
