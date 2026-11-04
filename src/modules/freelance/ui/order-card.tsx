import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/ui/listing-card";
import { ServiceIconBox } from "@/components/ui/service-icon";
import { orderDeadline, type PartyOrder } from "../service";
import { formatUsd } from "./format";
import { OrderSteps } from "./order-steps";

/** The saved order terms, never the current service price (TZ 28.4). */
export async function OrderCard({
  order,
  locale,
  now,
}: {
  order: PartyOrder;
  locale: string;
  now: Date;
}) {
  const t = await getTranslations("freelance");
  const dates = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const deadline = orderDeadline(order, now);
  return (
    <ListingCard
      href={`/freelance/orders/${order.id}`}
      headingLevel={2}
      title={order.serviceTitle}
      label={`${t("orders.one")} · ${order.id.slice(0, 8)}`}
      mark={<ServiceIconBox name="order" />}
      badges={
        <Badge
          tone={
            order.status === "completed"
              ? "success"
              : order.next.length > 0
                ? "new"
                : "neutral"
          }
        >
          {t(`orders.status.${order.status}`)}
        </Badge>
      }
      subtitle={
        <p className="t-body-s text-fg-muted">
          {t(`tiers.${order.packageTier}`)} ·{" "}
          <time className="font-mono" dateTime={order.createdAt.toISOString()}>
            {dates.format(order.createdAt)}
          </time>
        </p>
      }
      summary={t(`orders.hint.${order.side}.${order.status}`)}
      lead={
        <p className="font-mono text-2xl font-medium tracking-tight">
          {formatUsd(order.priceMinor, locale)}
        </p>
      }
      trail={
        <span className="t-data text-fg-muted">
          {t("days", { count: order.deliveryDays })}
        </span>
      }
      viewLabel={t("room.details")}
    >
      <OrderSteps
        status={order.status}
        label={t("room.steps")}
        labels={{
          sent: t("orders.status.sent"),
          accepted: t("orders.status.accepted"),
          in_progress: t("orders.status.in_progress"),
          delivered: t("orders.status.delivered"),
          completed: t("orders.status.completed"),
        }}
      />
      {deadline ? (
        <p className="t-data text-fg-muted">
          {t(`orders.deadline.${deadline.state}`, {
            date: dates.format(deadline.dueAt),
          })}
        </p>
      ) : null}
    </ListingCard>
  );
}
