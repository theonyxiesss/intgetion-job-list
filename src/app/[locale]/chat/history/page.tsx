import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
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

/** `/chat/history`: the signed-in person's conversations with Spoki. */
export default async function ChatHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await userOrLogin(locale);
  const t = await getTranslations("chat.history");
  const items = await listOwnConversations(user.id, 50);
  const when = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="py-10 md:py-16 in-data-[ui=v2]:py-6 md:in-data-[ui=v2]:py-8">
      <Container narrow className="flex flex-col gap-6">
        <PageHeader title={t("title")} intro={t("intro")} />
        {items.length === 0 ? (
          <EmptyState
            title={t("empty")}
            action={
              <Link href="/chat" className="underline underline-offset-4">
                {t("newChat")}
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={threadHref(item.topic)}
                  className="flex flex-col gap-1.5 rounded-lg border border-line p-4 hover:border-line-strong in-data-[ui=v2]:rounded-[18px] in-data-[ui=v2]:bg-surface"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="min-w-0 text-[15px] font-medium break-words">
                      {item.preview ?? t("noPreview")}
                    </span>
                    <time
                      dateTime={item.lastMessageAt}
                      className="text-xs text-fg-subtle"
                    >
                      {when.format(new Date(item.lastMessageAt))}
                    </time>
                  </span>
                  <span className="text-sm text-fg-muted">
                    {t(`topic.${item.topic.kind}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
