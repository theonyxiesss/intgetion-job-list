"use client";

import { ArrowUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  keyboardOverlaps,
  nextKeyboardPhase,
  type KeyboardPhase,
} from "@/components/bot/keyboard-inset";
import {
  FreelanceCardFields,
  FreelanceCardSummary,
  FreelanceLinkCard,
  FreelanceServiceList,
  isFreelanceCardTool,
  type FreelanceServiceCard,
} from "@/components/bot/freelance-card";
import { ConfirmCard } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { TELEGRAM_BOT_URL } from "@/config/telegram";
import { localePath } from "@/i18n/paths";
import { Link, useRouter } from "@/i18n/navigation";
import {
  appliedStatusFromConfirm,
  teamJobFromConfirm,
} from "@/modules/bot/service/application-status";
import {
  isOfferAction,
  offerPath,
  type OfferAction,
} from "@/modules/bot/service/offers";
import {
  STARTER_KEYS,
  STARTER_LANES,
  STARTER_SHOW,
  pickStarterKeys,
  type StarterLane,
} from "@/modules/bot/service/starters";

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
  | { key: string; kind: "offer"; action: OfferAction }
  | { key: string; kind: "ugc_join"; payload: string }
  | {
      key: string;
      kind: "freelance_services";
      services: FreelanceServiceCard[];
    }
  | {
      key: string;
      kind: "freelance_link";
      href: string;
      link: "order" | "cabinet";
    }
  | { key: string; kind: "notice"; code: string }
  | {
      key: string;
      kind: "confirm";
      confirmationId: string;
      tool: string;
      args?: unknown;
      /** Typed into the card by the person (D460). */
      fields?: string[];
      values?: Record<string, string>;
      state: "open" | "busy" | "accepted" | "declined" | "failed";
    };

type PendingCard = {
  confirmationId: string;
  tool: string;
  args?: unknown;
  fields?: string[];
};

const UUID = /^[0-9a-f-]{36}$/i;

function confirmEntry(card: PendingCard): Entry {
  return {
    key: card.confirmationId,
    kind: "confirm",
    confirmationId: card.confirmationId,
    tool: card.tool,
    args: card.args,
    fields: Array.isArray(card.fields) ? card.fields.map(String) : [],
    values: {},
    state: "open",
  };
}

/** A freelance tool result as a chat entry, or null for other kinds. */
function freelanceEntry(kind: unknown, data: unknown): Entry | null {
  if (kind === "freelance_services" && Array.isArray(data)) {
    return {
      key: nextKey(),
      kind: "freelance_services",
      services: data as FreelanceServiceCard[],
    };
  }
  const id = (data as { id?: unknown } | null)?.id;
  if (kind === "freelance_order" && typeof id === "string" && UUID.test(id)) {
    return {
      key: nextKey(),
      kind: "freelance_link",
      href: `/freelance/orders/${id}`,
      link: "order",
    };
  }
  if (kind === "freelance_service_saved") {
    return {
      key: nextKey(),
      kind: "freelance_link",
      href: "/profile/freelance",
      link: "cabinet",
    };
  }
  return null;
}

type HistoryMessage = { id: string; role: string; content: string };

const ERROR_CODES = new Set([
  "BOT_UNAVAILABLE",
  "BOT_BUDGET_EXCEEDED",
  "BOT_TRY_LATER",
  "RATE_LIMITED",
  "JOB_NEEDS_TEAM",
  "JOB_NEEDS_COMPANY",
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
export function Chat({
  signedIn,
  jobId,
  fromServices = false,
  fromCampaigns = false,
  campaignId,
  inviteId,
  focus,
  ugcProduct,
  serviceId,
  orderId,
  confirmId,
  freelanceTitle,
}: {
  signedIn: boolean;
  jobId?: string;
  /** `/chat?service=`, `/chat?order=` and `/chat?confirm=` (D460). */
  serviceId?: string;
  orderId?: string;
  confirmId?: string;
  freelanceTitle?: string;
  /** Opened from the Services page. The server owns the prompt text (D423). */
  fromServices?: boolean;
  /** Opened to write a creative-test brief (D457). */
  fromCampaigns?: boolean;
  campaignId?: string;
  inviteId?: string;
  focus?: { title: string; company: string };
  ugcProduct?: string;
}) {
  const t = useTranslations("chat");
  const explain = useTranslations("explain");
  const locale = useLocale();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [lane, setLane] = useState<StarterLane>("find");
  const [starterSeed, setStarterSeed] = useState(1);
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
  /** Empty chat sits mid-screen; a started conversation pins the field to the bottom. */
  const welcome = entries.length === 0;

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
    const params = new URLSearchParams();
    if (jobId) {
      params.set("job", jobId);
      params.set("locale", locale);
    } else if (campaignId) {
      params.set("campaign", campaignId);
      params.set("locale", locale);
    } else if (inviteId) {
      params.set("invite", inviteId);
      params.set("locale", locale);
    } else if (fromCampaigns) {
      params.set("from", "campaigns");
      params.set("locale", locale);
    } else if (fromServices) {
      params.set("from", "services");
      params.set("locale", locale);
    } else if (orderId) {
      params.set("order", orderId);
      params.set("locale", locale);
    } else if (serviceId) {
      params.set("service", serviceId);
      params.set("locale", locale);
    } else if (confirmId) {
      params.set("confirm", confirmId);
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";
    fetch(`/api/bot/conversation${query}`)
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          body: {
            messages: HistoryMessage[];
            draftOffer?: {
              confirmationId: string;
              tool: string;
            } | null;
            pending?: PendingCard[];
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
          for (const card of body.pending ?? []) {
            if (card.confirmationId === body.draftOffer?.confirmationId)
              continue;
            history.push(confirmEntry(card));
          }
          if (history.length) setEntries(history);
        },
      )
      .catch(() => undefined)
      .finally(() => {
        setStarterSeed(Math.floor(Math.random() * 0x7fffffff) || 1);
        setHistoryReady(true);
      });
  }, [
    jobId,
    fromServices,
    fromCampaigns,
    campaignId,
    inviteId,
    serviceId,
    orderId,
    confirmId,
    locale,
  ]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries, thinking]);

  useEffect(() => {
    const root = document.documentElement;
    const narrow = window.matchMedia("(max-width: 767px)");
    let phase: KeyboardPhase = { open: false, sawKeyboard: false };

    function sync() {
      const viewport = window.visualViewport;
      const covered =
        viewport != null &&
        keyboardOverlaps(
          window.innerHeight,
          viewport.height,
          viewport.offsetTop,
        );
      const wasOpen = phase.open;
      phase = nextKeyboardPhase(phase, {
        narrow: narrow.matches,
        covered,
        writing: document.activeElement === fieldRef.current,
      });
      if (phase.open) root.dataset.keyboard = "";
      else delete root.dataset.keyboard;
      if (phase.open && !wasOpen) {
        endRef.current?.scrollIntoView({ block: "end" });
      }
    }

    sync();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    narrow.addEventListener("change", sync);
    window.addEventListener("focusin", sync, true);
    window.addEventListener("focusout", sync, true);
    return () => {
      delete root.dataset.keyboard;
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      narrow.removeEventListener("change", sync);
      window.removeEventListener("focusin", sync, true);
      window.removeEventListener("focusout", sync, true);
    };
  }, []);

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
        body: JSON.stringify({
          text: message,
          locale,
          ...(fromServices ? { from: "services" as const } : {}),
          ...(fromCampaigns ? { from: "campaigns" as const } : {}),
          ...(campaignId ? { campaignId } : {}),
          ...(inviteId ? { inviteId } : {}),
        }),
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
        } else if (data.type === "tool_result" && data.kind === "ugc_join") {
          const payload = (data.data as { payload?: unknown } | null)?.payload;
          if (
            typeof payload === "string" &&
            /^ugc_[A-Za-z0-9_-]+$/.test(payload)
          ) {
            setThinking(false);
            add({ key: nextKey(), kind: "ugc_join", payload });
          }
        } else if (data.type === "tool_result" && data.kind === "offer") {
          const action = (data.data as { action?: unknown } | null)?.action;
          if (isOfferAction(action) && offerPath(action, signedIn)) {
            setThinking(false);
            add({ key: nextKey(), kind: "offer", action });
          }
        } else if (
          data.type === "tool_result" &&
          freelanceEntry(data.kind, data.data)
        ) {
          setThinking(false);
          add(freelanceEntry(data.kind, data.data)!);
        } else if (data.type === "confirm_request") {
          setThinking(false);
          add({
            ...confirmEntry({
              confirmationId: String(data.confirmationId),
              tool: String(data.tool),
              args: data.args,
              fields: data.fields as string[] | undefined,
            }),
            key: nextKey(),
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

  function setCardValue(key: string, name: string, value: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.key === key && entry.kind === "confirm"
          ? { ...entry, values: { ...entry.values, [name]: value } }
          : entry,
      ),
    );
  }

  async function decide(
    key: string,
    confirmationId: string,
    accept: boolean,
    values?: Record<string, string>,
  ) {
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
      body: JSON.stringify({
        confirmationId,
        accept,
        ...(accept && values && Object.keys(values).length
          ? { fields: values }
          : {}),
      }),
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
    const body = await response.json().catch(() => null);
    setState(accept ? "accepted" : "declined");
    const linked = accept
      ? freelanceEntry(
          (body as { result?: { kind?: unknown } } | null)?.result?.kind,
          (body as { result?: { data?: unknown } } | null)?.result?.data,
        )
      : null;
    if (linked) add(linked);
    const status = accept ? appliedStatusFromConfirm(body) : null;
    if (status) {
      add({
        key: nextKey(),
        kind: "event",
        text: t("applicationStatus.line", {
          status: t(`applicationStatus.${status}`),
        }),
      });
    }
    const queued = accept ? teamJobFromConfirm(body) : null;
    if (queued?.posted) {
      add({
        key: nextKey(),
        kind: "event",
        text: t("jobQueued.line", { title: queued.title }),
      });
    } else if (queued) {
      add({
        key: nextKey(),
        kind: "notice",
        code: queued.reason === "plan" ? "JOB_NEEDS_TEAM" : "JOB_NEEDS_COMPANY",
      });
    }
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
    <div className="chat-shell flex min-h-0 w-full flex-1 flex-col max-md:fixed max-md:inset-x-0 max-md:top-16 max-md:bottom-0 max-md:z-30 max-md:bg-bg">
      <div
        data-chat-meta
        className="mx-auto w-full max-w-3xl shrink-0 px-4 py-3 md:px-6"
      >
        <h1 className="text-sm font-medium">{t("title")}</h1>
        {focus && jobId ? (
          <p className="t-body-s mt-2 text-fg">
            {t("jobFocus.discussing", {
              title: focus.title,
              company: focus.company,
            })}{" "}
            <Link
              href={`/jobs/${jobId}`}
              className="underline underline-offset-4"
            >
              {t("jobFocus.back")}
            </Link>
          </p>
        ) : null}
        {ugcProduct ? (
          <p className="t-body-s mt-2 text-fg">
            {t("ugcFocus.line", { product: ugcProduct })}{" "}
            <Link
              href={campaignId ? `/campaigns/${campaignId}` : "/campaigns"}
              className="underline underline-offset-4"
            >
              {t("ugcFocus.back")}
            </Link>
          </p>
        ) : null}
        {fromCampaigns ? (
          <p className="t-body-s mt-2 text-fg">
            {t("ugcFocus.home")}{" "}
            <Link href="/campaigns" className="underline underline-offset-4">
              {t("ugcFocus.back")}
            </Link>
          </p>
        ) : null}
        {freelanceTitle ? (
          <p className="t-body-s mt-2 text-fg">
            {t("freelanceCard.focus", { title: freelanceTitle })}{" "}
            <Link
              href={orderId ? `/freelance/orders/${orderId}` : "/freelance"}
              className="underline underline-offset-4"
            >
              {t("freelanceCard.back")}
            </Link>
          </p>
        ) : null}
        {fromServices ? (
          <p className="t-body-s mt-2 text-fg">
            {t("serviceFocus.line")}{" "}
            <Link href="/services" className="underline underline-offset-4">
              {t("serviceFocus.back")}
            </Link>
          </p>
        ) : null}
      </div>
      <div
        role="log"
        aria-live="polite"
        aria-label={t("log")}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-4 md:px-6">
          {welcome && (
            <div className="mt-auto flex w-full flex-col items-center gap-4 pb-2 text-center">
              <h2 className="text-2xl font-medium md:text-3xl">
                {fromServices
                  ? t("serviceFocus.line")
                  : fromCampaigns
                    ? t("ugcFocus.home")
                    : t("welcome")}
              </h2>
              {fromServices || fromCampaigns ? null : (
                <p className="t-body-s max-w-md text-fg-muted">
                  {signedIn ? t("emptySignedIn") : t("emptyGuest")}
                </p>
              )}
              {historyReady && !jobId && !fromServices && !fromCampaigns && (
                <div className="flex w-full max-w-md flex-col gap-3">
                  <div
                    role="tablist"
                    aria-label={t("starters.label")}
                    className="flex flex-col gap-2"
                  >
                    {STARTER_LANES.map((id) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={lane === id}
                        className={`min-h-11 rounded-full border px-5 text-left ${
                          lane === id
                            ? "border-line-strong bg-surface-2"
                            : "border-line"
                        }`}
                        onClick={() => setLane(id)}
                      >
                        {t(`starters.lanes.${id}`)}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    {pickStarterKeys(
                      STARTER_KEYS[lane],
                      STARTER_SHOW,
                      starterSeed,
                    ).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="min-h-11 rounded-full border border-line px-5 text-left text-fg"
                        onClick={() => void ask(t(`starters.questions.${key}`))}
                      >
                        {t(`starters.questions.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {entries.map((entry) => {
            if (entry.kind === "user") {
              return (
                <p
                  key={entry.key}
                  className="max-w-[85%] self-end whitespace-pre-wrap break-words rounded-3xl bg-surface-2 px-4 py-2.5"
                >
                  {entry.text}
                </p>
              );
            }
            if (entry.kind === "assistant") {
              return (
                <div key={entry.key} className="min-w-0">
                  <span className="sr-only">{t("agent")}</span>
                  <p className="max-w-full whitespace-pre-wrap break-words leading-7">
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
                      className="rounded-2xl border border-line bg-surface-2 px-4 py-3"
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
                      <p className="t-body-s text-fg-muted">
                        {job.companyName}
                      </p>
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
            if (entry.kind === "ugc_join") {
              return (
                <div
                  key={entry.key}
                  className="flex max-w-md flex-col items-start gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3"
                >
                  <p className="font-medium">{t("ugcJoin.title")}</p>
                  <a
                    href={`${TELEGRAM_BOT_URL}?start=${entry.payload}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-bg"
                  >
                    {t("ugcJoin.action")}
                  </a>
                </div>
              );
            }
            if (entry.kind === "freelance_services") {
              return (
                <FreelanceServiceList
                  key={entry.key}
                  services={entry.services}
                />
              );
            }
            if (entry.kind === "freelance_link") {
              return (
                <FreelanceLinkCard
                  key={entry.key}
                  href={entry.href}
                  kind={entry.link}
                />
              );
            }
            if (entry.kind === "offer") {
              const path = offerPath(entry.action, signedIn);
              if (!path) return null;
              return (
                <div
                  key={entry.key}
                  className="flex max-w-md flex-col items-start gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {t(`offer.${entry.action}.title`)}
                    </p>
                    <p className="t-body-s text-fg-muted">
                      {t(`offer.${entry.action}.text`)}
                    </p>
                  </div>
                  <a
                    href={localePath(locale, path)}
                    className="inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-bg"
                  >
                    {t(`offer.${entry.action}.action`)}
                  </a>
                </div>
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
                    isFreelanceCardTool(entry.tool)
                      ? t(`freelanceCard.${entry.tool}.title`)
                      : entry.tool === "apply_to_job"
                        ? t("confirm.applyTitle")
                        : entry.tool === "propose_team_job"
                          ? t("confirm.jobTitle")
                          : entry.tool.includes("ugc") ||
                              entry.tool === "propose_creator_profile"
                            ? t("confirm.ugcTitle")
                            : t("confirm.profileTitle")
                  }
                  confirmLabel={t("confirm.accept")}
                  cancelLabel={t("confirm.decline")}
                  loading={entry.state === "busy"}
                  onConfirm={() =>
                    decide(entry.key, entry.confirmationId, true, entry.values)
                  }
                  onCancel={() =>
                    decide(entry.key, entry.confirmationId, false)
                  }
                >
                  {isFreelanceCardTool(entry.tool) ? (
                    <div className="flex flex-col gap-3">
                      <FreelanceCardSummary
                        tool={entry.tool}
                        args={entry.args}
                      />
                      {entry.fields?.length ? (
                        <FreelanceCardFields
                          id={entry.key}
                          fields={entry.fields}
                          values={entry.values ?? {}}
                          onChange={(name, value) =>
                            setCardValue(entry.key, name, value)
                          }
                        />
                      ) : null}
                    </div>
                  ) : (
                    t("confirm.text")
                  )}
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
      </div>
      <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-3 px-4 md:px-6">
        {actions.signup && !signedIn && (
          <p className="flex flex-col items-start gap-2">
            <Link
              href={{ pathname: "/register", query: { next: "chat" } }}
              className="inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-bg"
            >
              {t("createAccount")}
            </Link>
          </p>
        )}
        {actions.fillChoice && signedIn && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-5"
              onClick={() => void chooseFill("self")}
            >
              {t("fillSelf")}
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-bg"
              onClick={() => void chooseFill("spoki")}
            >
              {t("fillSpoki")}
            </button>
          </div>
        )}
        {actions.profileReview && signedIn && (
          <Link
            href="/profile"
            className="t-body-s underline underline-offset-4"
          >
            {t("reviewProfile")}
          </Link>
        )}
        <form
          onSubmit={send}
          className={`flex shrink-0 flex-col gap-2 ${welcome ? "" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]"}`}
        >
          <div className="flex items-end gap-2 rounded-[1.75rem] bg-surface-2 py-1.5 pr-1.5 pl-5 ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-fg-subtle">
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
              className="max-h-[min(10rem,30dvh)] min-h-11 flex-1 resize-none overflow-x-hidden bg-transparent py-3 leading-5 text-fg placeholder:text-fg-subtle focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-busy={sending || undefined}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-signal text-signal-fg transition-opacity disabled:opacity-40"
            >
              <Icon icon={ArrowUp} size={20} />
              <span className="sr-only">{t("send")}</span>
            </button>
          </div>
          <p data-chat-note className="t-body-s text-center text-fg-subtle">
            {t("disclaimer")}{" "}
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {t("telegramBot")}
            </a>
          </p>
        </form>
      </div>
      {welcome && (
        <div
          aria-hidden="true"
          className="min-h-0 flex-1 [@media(max-height:520px)]:hidden"
        />
      )}
    </div>
  );
}
