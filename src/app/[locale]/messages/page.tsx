import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import { clientIp } from "@/lib/request-ip";
import {
  getOrderView,
  getRoomFeed,
  listOrders,
} from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";
import { OrderRoom } from "@/modules/freelance/ui/order-room";
import { orderRoomCopy, userOrLogin } from "@/modules/freelance/ui/server-copy";
import { listMyCampaigns, listMyInvites } from "@/modules/ugc/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "inbox" });
  return { title: t("title"), robots: { index: false } };
}

type Thread = {
  key: string;
  kind: "order" | "creator" | "brand";
  title: string;
  sub: string;
  at: Date;
  href: string;
};

async function safe<T>(read: Promise<T>, fallback: T): Promise<T> {
  try {
    return await read;
  } catch {
    return fallback;
  }
}

const ICON: Record<Thread["kind"], string> = {
  order: "M4 7h16M4 12h10M4 17h7",
  creator: "M4 6h11v12H4zM15 10l5-3v10l-5-3",
  brand: "M4 6h11v12H4zM15 10l5-3v10l-5-3",
};

/**
 * `/messages` (mockup «Messages»): every conversation the person has with
 * other people — freelance orders on both sides and UGC rooms — in one list.
 * An order's room opens right here; a UGC room opens on its own page.
 */
export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ thread?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await userOrLogin(locale);
  const t = await getTranslations("inbox");
  const fl = await getTranslations("freelance");
  const ugc = await getTranslations("ugc");
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 100);

  const [buying, selling, invites, campaigns] = await Promise.all([
    safe(listOrders(user.id, "buyer"), []),
    safe(listOrders(user.id, "seller"), []),
    safe(listMyInvites(user.id), []),
    safe(listMyCampaigns(user.id), []),
  ]);
  const threads: Thread[] = [
    ...[...buying, ...selling].map((order) => ({
      key: `order:${order.id}`,
      kind: "order" as const,
      title: order.serviceTitle,
      sub: `${order.side === "buyer" ? t("youBuy") : t("youSell")} · ${fl(`orders.status.${order.status}`)}`,
      at: order.updatedAt,
      href: `/messages?thread=order:${order.id}`,
    })),
    ...invites.map((invite) => ({
      key: `creator:${invite.inviteId}`,
      kind: "creator" as const,
      title: invite.productName,
      sub: `${t("asCreator")} · ${ugc(`status.${invite.status}`)}`,
      at: new Date(invite.deadline),
      href: `/campaigns/${invite.campaignId}/room/${invite.inviteId}`,
    })),
    ...campaigns.map((campaign) => ({
      key: `brand:${campaign.id}`,
      kind: "brand" as const,
      title: campaign.productName,
      sub: `${t("asBrand")} · ${ugc(`status.${campaign.status}`)}`,
      at: new Date(campaign.deadline),
      href: `/campaigns/${campaign.id}#ugc-people`,
    })),
  ]
    .filter(
      (thread) =>
        !q ||
        thread.title
          .toLocaleLowerCase(locale)
          .includes(q.toLocaleLowerCase(locale)),
    )
    .sort((a, b) => +b.at - +a.at);

  const selectedKey =
    query.thread ?? threads.find((thread) => thread.kind === "order")?.key;
  const orderId = selectedKey?.startsWith("order:")
    ? selectedKey.slice("order:".length)
    : null;
  const order = orderId
    ? await safe(
        getOrderView(user.id, orderId, clientIp(await headers())),
        null,
      )
    : null;
  const feed = order ? await safe(getRoomFeed(user.id, order.id), null) : null;
  const copy = order ? await orderRoomCopy(locale) : null;
  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });

  return (
    <main className="px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {t("title")}
        </h1>
        {threads.length === 0 && !q ? (
          <EmptyState title={t("empty")} text={t("emptyText")} />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <section className="flex flex-col gap-2">
              <form role="search" action="">
                <label htmlFor="inbox-q" className="sr-only">
                  {t("search")}
                </label>
                <input
                  id="inbox-q"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder={t("search")}
                  className="min-h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:text-fg-subtle"
                />
              </form>
              {threads.length === 0 ? (
                <p className="px-1 py-3 text-sm text-fg-muted">
                  {t("notFound")}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {threads.map((thread) => {
                    const on = thread.key === selectedKey;
                    return (
                      <li key={thread.key}>
                        <Link
                          href={
                            thread.kind === "order"
                              ? `/messages?thread=${thread.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`
                              : thread.href
                          }
                          aria-current={on ? "true" : undefined}
                          className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${on ? "border-line-strong bg-surface" : "border-transparent hover:bg-surface"}`}
                        >
                          <span
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg-muted"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.7}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d={ICON[thread.kind]} />
                            </svg>
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium">
                              {thread.title}
                            </span>
                            <span className="truncate text-xs text-fg-subtle">
                              {thread.sub}
                            </span>
                          </span>
                          <time
                            dateTime={thread.at.toISOString()}
                            className="shrink-0 text-xs text-fg-subtle"
                          >
                            {day.format(thread.at)}
                          </time>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <section className="flex min-w-0 flex-col gap-3">
              {order && feed && copy ? (
                <>
                  <header className="flex flex-wrap items-center gap-3 rounded-[18px] border border-line bg-surface p-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-xs text-fg-subtle">
                        {t("order")} · {fl(`orders.status.${order.status}`)}
                      </span>
                      <span className="truncate text-[15px] font-semibold">
                        {order.serviceTitle}
                      </span>
                      <span className="text-sm text-fg-muted">
                        {[
                          order.counterpart?.name ?? null,
                          formatUsd(order.priceMinor, locale),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <Link
                      href={`/freelance/orders/${order.id}`}
                      className="flex min-h-10 items-center rounded-xl border border-line-strong px-3.5 text-sm hover:bg-surface-2"
                    >
                      {t("openRoom")}
                    </Link>
                  </header>
                  <div className="rounded-[18px] border border-line bg-surface p-4 [&_.t-label]:font-sans [&_.t-label]:text-xs [&_.t-label]:tracking-normal [&_.t-label]:normal-case">
                    <OrderRoom
                      orderId={order.id}
                      locale={intlLocale(locale)}
                      initial={feed}
                      copy={copy}
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-[18px] border border-line bg-surface p-6 text-sm text-fg-muted">
                  {t("pick")}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
