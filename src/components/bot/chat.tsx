"use client";

import { Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ConfirmCard } from "@/components/ui/dialog";
import { controlClass } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Link, useRouter } from "@/i18n/navigation";

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

type ChatActions = {
  signup: boolean;
  fillChoice: boolean;
  profileReview: boolean;
};

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
 * Web chat of 12.1 (D178), laid out as a conversation (D312). Model text is
 * shown as plain text, never HTML (16.2); job cards link only to platform
 * pages. Streamed tokens grow one answer instead of stacking one bubble per
 * token.
 */
export function Chat({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("chat");
  const explain = useTranslations("explain");
  const locale = useLocale();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [actions, setActions] = useState<ChatActions>({
    signup: false,
    fillChoice: false,
    profileReview: false,
  });
  const endRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  /** One line, then a few more, then a fixed cap. Past that, the field scrolls. */
  function fitComposer(node: HTMLTextAreaElement) {
    const cap = Number.parseFloat(getComputedStyle(node).maxHeight);
    node.style.height = "0px";
    const full = node.scrollHeight;
    const height = Number.isFinite(cap) ? Math.min(full, cap) : full;
    node.style.height = `${height}px`;
    const overflows = Number.isFinite(cap) && full > cap + 1;
    node.style.overflowY = overflows ? "auto" : "hidden";
    if (!overflows) node.scrollTop = 0;
  }

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
            actions?: ChatActions;
          } | null,
        ) => {
          if (!body) return;
          if (body.actions) setActions(body.actions);
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
  }, [entries, thinking]);

  const add = (entry: Entry) => setEntries((current) => [...current, entry]);

  /** Appends streamed text to the answer in progress, or starts one. */
  function appendAnswer(key: string, chunk: string) {
    setEntries((current) => {
      const last = current[current.length - 1];
      if (last && last.kind === "assistant" && last.key === key) {
        return [...current.slice(0, -1), { ...last, text: last.text + chunk }];
      }
      return [...current, { key, kind: "assistant", text: chunk }];
    });
  }

  async function ask(message: string) {
    if (!message || sending) return;
    setText("");
    fieldRef.current?.focus();
    setSending(true);
    setThinking(true);
    add({ key: nextKey(), kind: "user", text: message });
    const answerKey = nextKey();
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
          setThinking(false);
          appendAnswer(answerKey, String(data.text));
        } else if (
          data.type === "tool_result" &&
          (data.kind === "jobs" || data.kind === "matches")
        ) {
          setThinking(false);
          add({
            key: nextKey(),
            kind: data.kind,
            jobs: data.data as JobCard[],
          });
        } else if (data.type === "confirm_request") {
          setThinking(false);
          add({
            key: nextKey(),
            kind: "confirm",
            confirmationId: String(data.confirmationId),
            tool: String(data.tool),
            state: "open",
          });
        } else if (data.type === "error") {
          setThinking(false);
          add({ key: nextKey(), kind: "notice", code: String(data.code) });
        } else if (
          data.type === "resume_ack" ||
          data.type === "signup_hint" ||
          data.type === "profile_saved"
        ) {
          setThinking(false);
          add({ key: nextKey(), kind: "assistant", text: String(data.text) });
          if (data.type === "signup_hint") {
            setActions((current) => ({ ...current, signup: true }));
          }
          if (data.type === "resume_ack") {
            setActions((current) => ({ ...current, fillChoice: true }));
          }
          if (data.type === "profile_saved") {
            setActions((current) => ({ ...current, profileReview: true }));
          }
        } else if (data.type === "fill_choice") {
          setActions((current) => ({ ...current, fillChoice: true }));
        }
      }
    } catch {
      add({ key: nextKey(), kind: "notice", code: "BOT_TRY_LATER" });
    } finally {
      setThinking(false);
      setSending(false);
    }
  }

  useLayoutEffect(() => {
    if (fieldRef.current) fitComposer(fieldRef.current);
  }, [text]);

  function send(event: FormEvent) {
    event.preventDefault();
    void ask(text.trim());
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

  async function chooseFill(mode: "self" | "spoki") {
    setActions((current) => ({ ...current, fillChoice: false }));
    const response = await fetch("/api/bot/fill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode }),
    }).catch(() => null);
    if (!response?.ok) {
      setActions((current) => ({ ...current, fillChoice: true }));
      return;
    }
    const body = (await response.json().catch(() => null)) as {
      message?: string | null;
      messages?: string[];
      saved?: boolean;
    } | null;
    for (const line of body?.messages ?? []) {
      add({ key: nextKey(), kind: "assistant", text: line });
    }
    if (mode === "self") {
      router.push("/profile");
      return;
    }
    setActions((current) => ({ ...current, profileReview: true }));
  }

  return (
    <div className="chat-shell mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 px-4 max-md:fixed max-md:inset-x-0 max-md:top-16 max-md:bottom-0 max-md:z-30 max-md:max-w-none max-md:bg-bg md:px-6">
      <h1 className="shrink-0 py-3 text-sm font-medium">{t("title")}</h1>
      <div
        role="log"
        aria-live="polite"
        aria-label={t("log")}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto"
      >
        {entries.length === 0 && (
          <p className="t-body-s m-auto max-w-md py-8 text-center text-fg-muted">
            {signedIn ? t("emptySignedIn") : t("emptyGuest")}
          </p>
        )}
        {entries.map((entry) => {
          if (entry.kind === "user") {
            return (
              <p
                key={entry.key}
                className="max-w-full whitespace-pre-wrap break-words border border-line-strong bg-surface-2 px-4 py-3"
              >
                {entry.text}
              </p>
            );
          }
          if (entry.kind === "assistant") {
            return (
              <div key={entry.key} className="flex min-w-0 flex-col gap-1">
                <span className="t-label text-signal">{t("agent")}</span>
                <p className="max-w-full whitespace-pre-wrap break-words">
                  {entry.text}
                </p>
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
                  <li
                    key={job.id}
                    className="border border-line bg-surface-2 px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {job.title}
                      </Link>
                      {job.score !== undefined && (
                        <span className="t-label shrink-0 text-signal">
                          {t("score", { score: Math.round(job.score * 100) })}
                        </span>
                      )}
                    </div>
                    <p className="t-body-s text-fg-muted">{job.companyName}</p>
                    {job.explain?.slice(0, 3).map((line) => (
                      <p
                        key={line.detail.key}
                        className="t-body-s text-fg-subtle"
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
        {thinking && (
          <p className="t-label text-fg-muted" aria-live="polite">
            {t("thinking")}
          </p>
        )}
        <div ref={endRef} />
      </div>
      {actions.signup && !signedIn && (
        <p className="flex flex-col items-start gap-2">
          <Link
            href={{ pathname: "/register", query: { next: "chat" } }}
            className="inline-flex min-h-11 items-center bg-fg px-4 text-bg"
          >
            {t("createAccount")}
          </Link>
        </p>
      )}
      {actions.fillChoice && signedIn && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center border border-line px-4"
            onClick={() => void chooseFill("self")}
          >
            {t("fillSelf")}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center bg-fg px-4 text-bg"
            onClick={() => void chooseFill("spoki")}
          >
            {t("fillSpoki")}
          </button>
        </div>
      )}
      {actions.profileReview && signedIn && (
        <Link href="/profile" className="t-body-s underline underline-offset-4">
          {t("reviewProfile")}
        </Link>
      )}
      <form
        onSubmit={send}
        className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative">
          <label className="sr-only" htmlFor="chat-input">
            {t("placeholder")}
          </label>
          <textarea
            ref={fieldRef}
            id="chat-input"
            rows={1}
            value={text}
            maxLength={2000}
            placeholder={t("placeholder")}
            onChange={(event) => {
              setText(event.target.value);
              fitComposer(event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            style={{ paddingRight: "3rem" }}
            className={`${controlClass} max-h-[min(10rem,30dvh)] min-h-11 resize-none overflow-x-hidden py-2.5 leading-5`}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-busy={sending || undefined}
            className="absolute right-0 bottom-0 flex size-11 items-center justify-center text-fg disabled:opacity-40"
          >
            <Icon icon={Send} size={16} />
            <span className="sr-only">{t("send")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
