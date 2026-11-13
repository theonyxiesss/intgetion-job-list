import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/i18n/navigation";
import {
  listOwnConversations,
  type ConversationHistoryItem,
} from "@/modules/bot/service";
import { userOrLogin } from "@/modules/freelance/ui/server-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat.history" });
  return { title: t("title"), robots: { index: false } };
}

/** Where the chat reopens a thread: the same addresses `/chat` reads. */
function threadHref(topic: ConversationHistoryItem["topic"]): string {
  switch (topic.kind) {
    case "job":
      return `/chat?job=${topic.id}`;
    case "campaign":
      return `/chat?campaign=${topic.id}`;
    case "invite":
      return `/chat?invite=${topic.id}`;
    default:
      return "/chat";
  }
}

const TOPIC_ICON: Record<ConversationHistoryItem["topic"]["kind"], string> = {
  job: "M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  campaign: "M4 6h11v12H4zM15 10l5-3v10l-5-3",
  invite: "M4 6h11v12H4zM15 10l5-3v10l-5-3",
  general: "M4 5h16v11H8l-4 4z",
};
const TOPICS = ["all", "job", "campaign", "general"] as const;

/** `/chat/history`: the signed-in person's conversations with Spoki (mockup «History»). */
export default async function ChatHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; topic?: string }>;
}) {
  const { locale } = await params;
  const raw = await searchParams;
  const query = (raw.q ?? "").trim().slice(0, 100);
  const topic = (TOPICS as readonly string[]).includes(raw.topic ?? "")
    ? (raw.topic as (typeof TOPICS)[number])
    : "all";
  setRequestLocale(locale);
  const user = await userOrLogin(locale);
  const t = await getTranslations("chat.history");
  const all = await listOwnConversations(user.id, 100);
  // Search by the first question; text past retention is gone (D471).
  const needle = query.toLocaleLowerCase(locale);
  const items = all.filter(
    (item) =>
      (!needle || item.preview?.toLocaleLowerCase(locale).includes(needle)) &&
      (topic === "all" ||
        item.topic.kind === topic ||
        (topic === "campaign" && item.topic.kind === "invite")),
  );
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });
  const startOf = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = startOf(new Date());
  const groupOf = (iso: string) => {
    const at = startOf(new Date(iso));
    if (at === today) return "today";
    if (at === today - 86_400_000) return "yesterday";
    if (at > today - 7 * 86_400_000) return "week";
    return "earlier";
  };
  const groups = (["today", "yesterday", "week", "earlier"] as const)
    .map((key) => ({
      key,
      items: items.filter((item) => groupOf(item.lastMessageAt) === key),
    }))
    .filter((group) => group.items.length > 0);
  const hrefFor = (nextTopic: string) => {
    const params = new URLSearchParams();
    if (nextTopic !== "all") params.set("topic", nextTopic);
    if (query) params.set("q", query);
    const text = params.toString();
    return text ? `/chat/history?${text}` : "/chat/history";
  };
  const seg = (on: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm whitespace-nowrap ${on ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg"}`;

  return (
    <main className="px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid max-w-[1180px] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {t("title")}
          </h1>
          <form role="search" action="" className="flex">
            {topic !== "all" ? (
              <input type="hidden" name="topic" value={topic} />
            ) : null}
            <label htmlFor="chat-search" className="sr-only">
              {t("search")}
            </label>
            <div className="flex min-h-12 flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-4 focus-within:border-line-strong">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                aria-hidden="true"
                className="shrink-0 text-fg-subtle"
              >
                <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" />
              </svg>
              <input
                id="chat-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder={t("searchLong")}
                maxLength={100}
                className="min-h-11 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-fg-subtle focus-visible:outline-none"
              />
            </div>
          </form>
          <nav
            aria-label={t("title")}
            className="flex max-w-full gap-1 self-start overflow-x-auto rounded-xl border border-line bg-surface-2 p-1"
          >
            {TOPICS.map((key) => (
              <Link
                key={key}
                href={hrefFor(key)}
                aria-current={topic === key ? "page" : undefined}
                className={seg(topic === key)}
              >
                {t(`filter.${key}`)}
              </Link>
            ))}
          </nav>
          {all.length === 0 ? (
            <EmptyState
              title={t("empty")}
              action={
                <Link href="/chat" className="underline underline-offset-4">
                  {t("newChat")}
                </Link>
              }
            />
          ) : groups.length === 0 ? (
            <EmptyState title={t("notFound")} />
          ) : (
            groups.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <h2 className="px-1 text-xs text-fg-subtle">
                  {t(`group.${group.key}`)}
                </h2>
                <ul className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={threadHref(item.topic)}
                        className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 hover:border-line-strong"
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
                            <path d={TOPIC_ICON[item.topic.kind]} />
                          </svg>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[15px] font-medium">
                            {item.preview ?? t("noPreview")}
                          </span>
                          <span className="truncate text-sm text-fg-muted">
                            {t(`topic.${item.topic.kind}`)}
                          </span>
                        </span>
                        <time
                          dateTime={item.lastMessageAt}
                          className="shrink-0 text-xs text-fg-subtle"
                        >
                          {group.key === "today"
                            ? time.format(new Date(item.lastMessageAt))
                            : day.format(new Date(item.lastMessageAt))}
                        </time>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <aside className="flex flex-col gap-3">
          <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4">
            <h2 className="text-[15px] font-semibold">{t("keepTitle")}</h2>
            <p className="text-sm text-fg-muted">{t("keepText")}</p>
            <Link
              href="/settings/privacy"
              className="flex min-h-10 items-center justify-center rounded-xl border border-line-strong text-sm font-medium hover:bg-surface-2"
            >
              {t("memorySettings")}
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
