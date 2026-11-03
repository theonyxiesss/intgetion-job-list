import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { listOrders } from "@/modules/freelance/service";
import { OrderCard } from "@/modules/freelance/ui/order-card";
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
  const now = new Date();

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
          <ul className="grid gap-4">
            {orders.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} locale={locale} now={now} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
