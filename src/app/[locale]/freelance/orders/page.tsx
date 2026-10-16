import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { navForward } from "@/components/ui/page-transition";
import { LinkTabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { listOrders } from "@/modules/freelance/service";
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

const WAITING = new Set(["sent", "accepted", "in_progress", "delivered"]);

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
  const orders = await listOrders(user.id, side);
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
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/freelance/orders/${order.id}`}
                  {...navForward}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium">{order.serviceTitle}</span>
                    <span className="t-data text-fg-muted">
                      {t(`tiers.${order.packageTier}`)} ·{" "}
                      {formatUsd(order.priceMinor, locale)} ·{" "}
                      <time dateTime={order.createdAt.toISOString()}>
                        {dates.format(order.createdAt)}
                      </time>
                    </span>
                  </span>
                  <Badge
                    tone={
                      WAITING.has(order.status)
                        ? order.next.length > 0
                          ? "new"
                          : "pending"
                        : order.status === "completed"
                          ? "success"
                          : "neutral"
                    }
                  >
                    {t(`orders.status.${order.status}`)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
