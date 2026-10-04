"use client";

import { Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmCard } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";

type ExplainLine = {
  detail: { key: string; params: Record<string, string | number> };
};

type JobCard = {
  id: string;
  title: string;
  companyName: string;
  workFormat: string;
  score?: number;
  explain?: ExplainLine[];
};

type Entry =
  | { key: string; kind: "user" | "assistant" | "event"; text: string }
  | { key: string; kind: "jobs" | "matches"; jobs: JobCard[] }
  | { key: string; kind: "notice"; code: string }
  | {
      key: string;
      kind: "confirm";
      confirmationId: string;
      tool: string;
      state: "open" | "busy" | "accepted" | "declined" | "failed";
    };

type HistoryMessage = { id: string; role: string; content: string };

const ERROR_CODES = new Set([
  "BOT_UNAVAILABLE",
  "BOT_BUDGET_EXCEEDED",
  "BOT_TRY_LATER",
  "RATE_LIMITED",
]);

let counter = 0;
const nextKey = () => `e${(counter += 1)}`;

/** Splits an SSE body into `{ event, data }` frames as they arrive. */
async function* readEvents(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end = buffer.indexOf("\n\n");
    while (end !== -1) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = frame
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6);
      if (data) yield JSON.parse(data) as Record<string, unknown>;
      end = buffer.indexOf("\n\n");
    }
  }
}

/**
 * Web chat of 12.1 (D178). Model text is shown as plain text, never HTML
 * (16.2); job cards link only to platform pages.
 */
export function Chat({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("chat");
  const explain = useTranslations("explain");
  const locale = useLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/bot/conversation")
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          body: {
            messages: HistoryMessage[];
            draftOffer?: {
              confirmationId: string;
              tool: string;
            } | null;
          } | null,
        ) => {
          if (!body) return;
          const history: Entry[] = body.messages.map((message) => ({
            key: message.id,
            kind:
              message.role === "user"
                ? "user"
                : message.role === "assistant"
                  ? "assistant"
                  : "event",
            text: message.content,
          }));
          if (body.draftOffer) {
            history.push({
              key: body.draftOffer.confirmationId,
              kind: "confirm",
              confirmationId: body.draftOffer.confirmationId,
              tool: body.draftOffer.tool,
              state: "open",
            });
          }
          if (history.length) setEntries(history);
        },
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries]);

  const add = (entry: Entry) => setEntries((current) => [...current, entry]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message || sending) return;
    setText("");
    setSending(true);
    add({ key: nextKey(), kind: "user", text: message });
    try {
      const response = await fetch("/api/bot/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: message, locale }),
      });
      if (!response.ok || !response.body) {
        add({
          key: nextKey(),
          kind: "notice",
          code: response.status === 429 ? "RATE_LIMITED" : "BOT_TRY_LATER",
        });
        return;
      }
      for await (const data of readEvents(response.body)) {
        if (data.type === "token") {
          add({ key: nextKey(), kind: "assistant", text: String(data.text) });
        } else if (
          data.type === "tool_result" &&
          (data.kind === "jobs" || data.kind === "matches")
        ) {
          add({
            key: nextKey(),
            kind: data.kind,
            jobs: data.data as JobCard[],
          });
        } else if (data.type === "confirm_request") {
          add({
            key: nextKey(),
            kind: "confirm",
            confirmationId: String(data.confirmationId),
            tool: String(data.tool),
            state: "open",
          });
        } else if (data.type === "error") {
          add({ key: nextKey(), kind: "notice", code: String(data.code) });
        }
      }
    } catch {
      add({ key: nextKey(), kind: "notice", code: "BOT_TRY_LATER" });
    } finally {
      setSending(false);
    }
  }

  async function decide(key: string, confirmationId: string, accept: boolean) {
    const setState = (state: Extract<Entry, { kind: "confirm" }>["state"]) =>
      setEntries((current) =>
        current.map((entry) =>
          entry.key === key && entry.kind === "confirm"
            ? { ...entry, state }
            : entry,
        ),
      );
    setState("busy");
    const response = await fetch("/api/bot/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmationId, accept }),
    }).catch(() => null);
    if (!response?.ok) {
      const body = response
        ? ((await response.json().catch(() => null)) as {
            error?: { details?: { missing?: string[] } };
          } | null)
        : null;
      const missing = body?.error?.details?.missing;
      if (missing?.length) {
        add({
          key: nextKey(),
          kind: "notice",
          code: `missing:${missing.join(", ")}`,
        });
      }
      return setState("failed");
    }
    setState(accept ? "accepted" : "declined");
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="log"
        aria-live="polite"
        aria-label={t("log")}
        className="flex min-h-80 flex-col gap-4 border border-line bg-surface p-5"
      >
        {entries.length === 0 && (
          <p className="t-body-s text-fg-muted">
            {signedIn ? t("emptySignedIn") : t("emptyGuest")}
          </p>
        )}
        {entries.map((entry) => {
          if (entry.kind === "user" || entry.kind === "assistant") {
            return (
              <div
                key={entry.key}
                className={
                  entry.kind === "user"
                    ? "self-end max-w-[80%] border border-line-strong px-4 py-3"
                    : "self-start max-w-[80%] px-1 py-1"
                }
              >
                <p className="t-label text-fg-muted">
                  {entry.kind === "user" ? t("you") : t("agent")}
                </p>
                <p className="whitespace-pre-wrap">{entry.text}</p>
              </div>
            );
          }
          if (entry.kind === "event") {
            return (
              <p key={entry.key} className="t-body-s text-fg-muted">
                {entry.text}
              </p>
            );
          }
          if (entry.kind === "jobs" || entry.kind === "matches") {
            return (
              <ul key={entry.key} className="grid gap-2">
                {entry.jobs.map((job) => (
                  <li key={job.id} className="border border-line px-4 py-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="t-body-s text-fg-muted">
                      {job.companyName}
                      {job.score !== undefined
                        ? ` · ${t("score", { score: Math.round(job.score * 100) })}`
                        : ""}
                    </p>
                    {job.explain?.slice(0, 4).map((line) => (
                      <p
                        key={line.detail.key}
                        className="t-body-s text-fg-muted"
                      >
                        {explain(
                          line.detail.key.replace(/^explain\./, ""),
                          line.detail.params,
                        )}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            );
          }
          if (entry.kind === "notice") {
            return (
              <Alert key={entry.key} tone="warning">
                {entry.code.startsWith("missing:")
                  ? t("confirm.missing", { fields: entry.code.slice(8) })
                  : ERROR_CODES.has(entry.code)
                    ? t(`errors.${entry.code}`)
                    : t("errors.generic")}
              </Alert>
            );
          }
          if (entry.kind !== "confirm") return null;
          if (entry.state === "open" || entry.state === "busy") {
            return (
              <ConfirmCard
                key={entry.key}
                title={
                  entry.tool === "apply_to_job"
                    ? t("confirm.applyTitle")
                    : t("confirm.profileTitle")
                }
                confirmLabel={t("confirm.accept")}
                cancelLabel={t("confirm.decline")}
                loading={entry.state === "busy"}
                onConfirm={() => decide(entry.key, entry.confirmationId, true)}
                onCancel={() => decide(entry.key, entry.confirmationId, false)}
              >
                {t("confirm.text")}
              </ConfirmCard>
            );
          }
          return (
            <p key={entry.key} className="t-body-s text-fg-muted">
              {t(`confirm.${entry.state}`)}
            </p>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={send}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="sr-only" htmlFor="chat-input">
          {t("placeholder")}
        </label>
        <Textarea
          id="chat-input"
          value={text}
          maxLength={2000}
          placeholder={t("placeholder")}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="min-h-20 flex-1"
        />
        <Button
          type="submit"
          loading={sending}
          disabled={!text.trim()}
          icon={<Icon icon={Send} size={16} />}
        >
          {t("send")}
        </Button>
      </form>
      {!signedIn && (
        <p className="t-body-s text-fg-muted">
          {t("guestHint")}{" "}
          <Link href="/register" className="underline underline-offset-4">
            {t("signUp")}
          </Link>
        </p>
      )}
    </div>
  );
}
