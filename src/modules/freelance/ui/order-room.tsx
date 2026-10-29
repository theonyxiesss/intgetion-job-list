"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { RoomFeed, RoomFeedItem } from "../service";
import { callApi, errorText, type ClientCopy } from "./client-api";

const POLL_MS = 15_000;
const BODY_MAX = 2000;

/**
 * The order room (TZ 45 §4): one feed of the parties' messages and the
 * order's events, and a field to write. Reads every 15 s while the tab is
 * visible; no sockets.
 */
export function OrderRoom({
  orderId,
  locale,
  initial,
  copy,
}: {
  orderId: string;
  locale: string;
  initial: RoomFeed;
  copy: ClientCopy;
}) {
  const [feed, setFeed] = useState(initial);
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLLIElement>(null);
  const url = `/api/freelance/orders/${orderId}/messages`;

  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok) setFeed((await response.json()) as RoomFeed);
      } catch {
        // The next tick tries again; the feed on screen stays.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [url]);

  const time = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const links = link.trim() ? [link.trim()] : [];
    const result = await callApi<RoomFeed>(url, { body, links });
    setBusy(false);
    if (result.ok) {
      setFeed(result.data);
      setBody("");
      setLink("");
      endRef.current?.scrollIntoView({ block: "nearest" });
      return;
    }
    setError(errorText(copy, result.code));
  }

  function who(item: Extract<RoomFeedItem, { kind: "message" }>) {
    if (item.mine) return copy.room_you;
    if (item.side === "deleted") return copy.room_deleted;
    return item.side === "buyer" ? copy.room_buyer : copy.room_seller;
  }

  function line(item: RoomFeedItem) {
    if (item.kind === "status") {
      return copy[`status_${item.to}`] ?? item.to;
    }
    if (item.kind === "delivery") return copy.room_delivered;
    if (item.kind === "payment") return copy.room_paid;
    return "";
  }

  return (
    <section aria-labelledby="order-room-title" className="flex flex-col gap-4">
      <h2 id="order-room-title" className="t-h3">
        {copy.room_title}
      </h2>
      {feed.items.some((item) => item.kind === "message") ? null : (
        <p className="t-body-s text-fg-muted">{copy.room_empty}</p>
      )}
      <ol aria-live="polite" className="flex flex-col gap-3">
        {feed.items.map((item) =>
          item.kind === "message" ? (
            <li
              key={item.id}
              className={
                item.mine
                  ? "flex flex-col gap-1 self-end rounded-lg border border-line bg-surface p-3 sm:max-w-[80%]"
                  : "flex flex-col gap-1 self-start rounded-lg border border-line p-3 sm:max-w-[80%]"
              }
            >
              <p className="t-body-s flex flex-wrap gap-x-2 text-fg-muted">
                <span>{who(item)}</span>
                <time
                  className="t-data"
                  dateTime={item.at}
                  suppressHydrationWarning
                >
                  {time.format(new Date(item.at))}
                </time>
              </p>
              {item.hidden ? (
                <p className="t-body-s text-fg-muted">{copy.room_hidden}</p>
              ) : (
                <>
                  <p className="whitespace-pre-wrap break-words">{item.body}</p>
                  {item.links.map((href) => (
                    <a
                      key={href}
                      href={href}
                      rel="noopener noreferrer nofollow ugc"
                      className="t-data inline-flex min-h-6 items-center self-start break-all underline underline-offset-4"
                    >
                      {new URL(href).host}
                    </a>
                  ))}
                </>
              )}
            </li>
          ) : (
            <li
              key={item.id}
              className="t-body-s flex flex-wrap gap-x-2 text-fg-muted"
            >
              <time
                className="t-data"
                dateTime={item.at}
                suppressHydrationWarning
              >
                {time.format(new Date(item.at))}
              </time>
              <span>{line(item)}</span>
            </li>
          ),
        )}
        <li ref={endRef} aria-hidden="true" />
      </ol>
      {!feed.ready ? (
        <p className="t-body-s text-fg-muted">{copy.room_not_ready}</p>
      ) : !feed.writable ? (
        <p className="t-body-s text-fg-muted">{copy.room_closed}</p>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-3" noValidate>
          <Field
            label={copy.room_message}
            help={`${body.trim().length}/${BODY_MAX}`}
            error={error}
          >
            <Textarea
              value={body}
              maxLength={BODY_MAX}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </Field>
          <Field label={copy.room_link}>
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={copy.deliveryPlaceholder}
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
          </Field>
          <Button
            type="submit"
            variant="secondary"
            loading={busy}
            disabled={body.trim().length === 0}
            className="self-start"
          >
            {copy.room_send}
          </Button>
        </form>
      )}
    </section>
  );
}
