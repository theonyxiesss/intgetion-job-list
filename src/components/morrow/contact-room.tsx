"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp } from "lucide-react";
import type { ChatThread } from "@/app/api/me/threads/route";

export type StatusLabels = {
  application: Record<string, string>;
  order: Record<string, string>;
};

type FeedItem =
  | {
      kind: "message";
      id: string;
      mine: boolean;
      body: string | null;
      hidden: boolean;
    }
  | { kind: "status"; id: string; to: string }
  | { kind: "payment"; id: string }
  | { kind: "delivery"; id: string; url: string };

type Feed = { ready: boolean; writable: boolean; items: FeedItem[] };

/**
 * One "clients and recruiters" thread of the chat home (TZ 53). A job
 * application shows what was sent and its status: the platform has no
 * recruiter chat. A freelance order is its real room (TZ 45).
 */
export function ContactRoom({
  thread,
  labels,
}: {
  thread: ChatThread;
  labels: StatusLabels;
}) {
  const t = useTranslations("morrow.contacts");
  return (
    <div className="morrow-room">
      <div className="morrow-room-head">
        <strong>
          {thread.kind === "recruiter"
            ? `${thread.company} · ${thread.title}`
            : thread.title}
        </strong>
        <span>
          {thread.kind === "recruiter"
            ? t("recruiterNote")
            : thread.side === "buyer"
              ? t("asBuyer")
              : t("asSeller")}
        </span>
      </div>
      {thread.kind === "recruiter" ? (
        <ApplicationRoom thread={thread} labels={labels} />
      ) : (
        <OrderRoom thread={thread} labels={labels} />
      )}
    </div>
  );
}

function ApplicationRoom({
  thread,
  labels,
}: {
  thread: Extract<ChatThread, { kind: "recruiter" }>;
  labels: StatusLabels;
}) {
  const t = useTranslations("morrow.contacts");
  return (
    <div className="morrow-room-feed">
      <div className="morrow-room-mine">
        <p className="morrow-room-caption">{t("yourLetter")}</p>
        <p>{thread.coverNote?.trim() || t("noLetter")}</p>
      </div>
      <p className="morrow-room-status">
        {t("status", {
          status: labels.application[thread.status] ?? thread.status,
        })}
      </p>
    </div>
  );
}

function OrderRoom({
  thread,
  labels,
}: {
  thread: Extract<ChatThread, { kind: "client" }>;
  labels: StatusLabels;
}) {
  const t = useTranslations("morrow.contacts");
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const url = `/api/freelance/orders/${thread.id}/messages`;

  const load = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setFeed((await response.json()) as Feed);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [url]);

  useEffect(() => {
    // Loads the room once it opens; later state comes from posting.
    const first = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(first);
  }, [load]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setFeed((await response.json()) as Feed);
      setText("");
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  if (!feed) {
    return (
      <p className="morrow-room-status" role="status">
        {failed ? t("error") : t("loading")}
      </p>
    );
  }
  return (
    <>
      <div className="morrow-room-feed" role="log" aria-label={t("feed")}>
        {!feed.ready ? (
          <p className="morrow-room-status">{t("notReady")}</p>
        ) : null}
        {feed.items.map((item) => {
          if (item.kind === "message") {
            return (
              <div
                key={item.id}
                className={
                  item.mine ? "morrow-room-mine" : "morrow-room-theirs"
                }
              >
                <p>{item.hidden ? t("hidden") : (item.body ?? "")}</p>
              </div>
            );
          }
          return (
            <p key={item.id} className="morrow-room-status">
              {item.kind === "status"
                ? t("status", { status: labels.order[item.to] ?? item.to })
                : item.kind === "payment"
                  ? t("payment")
                  : t("delivery")}
            </p>
          );
        })}
        {failed ? (
          <p className="morrow-room-status" role="alert">
            {t("error")}
          </p>
        ) : null}
      </div>
      {feed.writable ? (
        <form onSubmit={send} className="morrow-room-form">
          <label className="sr-only" htmlFor="room-input">
            {t("placeholder")}
          </label>
          <input
            id="room-input"
            value={text}
            maxLength={2000}
            placeholder={t("placeholder")}
            onChange={(event) => setText(event.target.value)}
          />
          <button type="submit" disabled={!text.trim() || sending}>
            <ArrowUp size={18} aria-hidden="true" />
            <span className="sr-only">{t("send")}</span>
          </button>
        </form>
      ) : (
        <p className="morrow-room-status">{t("closed")}</p>
      )}
    </>
  );
}
