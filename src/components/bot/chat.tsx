"use client";

import { ArrowDown, ArrowUp, RotateCcw, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useStickToBottom } from "use-stick-to-bottom";
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
  cardText,
  FreelanceCopyContext,
  type FreelanceCardCopy,
  FreelanceCardFields,
  FreelanceCardSummary,
  FreelanceLinkCard,
  type FreelanceLinkKind,
  FreelanceServiceList,
  FreelanceTaskCards,
  type FreelanceTaskCardItem,
  isFreelanceCardTool,
  type FreelanceServiceCard,
} from "@/components/bot/freelance-card";
import {
  AccountCardText,
  ApplyCardText,
  isAccountCardTool,
} from "@/components/bot/account-card";
import { AssistantAnswer } from "@/components/bot/chat-markdown";
import { ChatSuggestions } from "@/components/bot/chat-suggestions";
import { afterJobResults, NO_JOBS_YET } from "@/components/bot/no-jobs";
import {
  JobGoalPanel,
  type JobGoalAction,
} from "@/components/bot/job-goal-panel";
import type { JobGoal } from "@/modules/bot/service/job-goal";
import { draftCardDue } from "@/components/bot/draft-card";
import { ThinkingStatusLine } from "@/components/bot/thinking-status-line";
import { WorkProgressCard } from "@/components/bot/work-progress-card";
import {
  advanceWork,
  finishWork,
  type WorkState,
  type WorkStep,
} from "@/components/bot/work-progress";
import {
  SpokiBlock,
  type CalcValues,
} from "@/components/bot/blocks/spoki-block";
import {
  UI_COMPONENTS,
  UI_VERSION,
  type UiBlock,
} from "@/modules/bot/ui/types";
import { ConfirmCard } from "@/components/ui/dialog";
import { ugcBudgetMinor, usdLabel } from "@/modules/ugc/service/pricing";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { TELEGRAM_BOT_URL } from "@/config/telegram";
import { localePath } from "@/i18n/paths";
import { Link, useRouter } from "@/i18n/navigation";
import type { PageSection } from "@/config/page-sections";
import {
  appliedStatusFromConfirm,
  teamJobFromConfirm,
} from "@/modules/bot/service/application-status";
import {
  fillKindOf,
  fillPaths,
  isFillKind,
  isOfferAction,
  offerPath,
  type FillKind,
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
  | {
      key: string;
      kind: "work";
      steps: WorkStep[];
      state: WorkState;
      /** A fallback model answered this turn (D554). */
      fallback?: boolean;
    }
  | { key: string; kind: "user" | "event"; text: string }
  /** `live`: arrived in this visit, so it types itself out (D514). */
  | {
      key: string;
      kind: "assistant";
      text: string;
      live?: boolean;
      /** The stored answer, for 👍 / 👎 (D514). */
      messageId?: string;
    }
  | { key: string; kind: "jobs" | "matches"; jobs: JobCard[] }
  | { key: string; kind: "offer"; action: OfferAction }
  /** Fill something in with Spoki here or alone in the form (D516). */
  | { key: string; kind: "fill_choice"; fill: FillKind }
  | { key: string; kind: "ugc_join"; payload: string }
  | {
      key: string;
      kind: "freelance_services";
      services: FreelanceServiceCard[];
    }
  | { key: string; kind: "freelance_tasks"; tasks: FreelanceTaskCardItem[] }
  | {
      key: string;
      kind: "freelance_link";
      href: string;
      link: FreelanceLinkKind;
    }
  | { key: string; kind: "notice"; code: string }
  /** A Spoki block (D523); its buttons and slider values live here. */
  | {
      key: string;
      kind: "ui";
      block: UiBlock;
      done: string[];
      busy?: string;
      note?: "failed" | "signIn" | "stale";
      values?: CalcValues;
      live?: boolean;
    }
  | {
      key: string;
      kind: "ugc_brief_draft";
      draftId: string;
      missing: number;
      draft: Record<string, unknown>;
      assumptions: string[];
    }
  | {
      key: string;
      kind: "freelance_service_draft";
      draftId: string;
      missing: number;
      draft: Record<string, unknown>;
    }
  | {
      key: string;
      kind: "job_draft";
      draftId: string;
      missing: number;
      draft: Record<string, unknown>;
    }
  | {
      key: string;
      kind: "confirm";
      confirmationId: string;
      tool: string;
      args?: unknown;
      /** Typed into the card by the person (D460). */
      fields?: string[];
      values?: Record<string, string>;
      /** The target named by the server (D472). */
      preview?: string;
      state:
        | "open"
        | "busy"
        | "accepted"
        | "declined"
        | "failed"
        | "expired"
        | "notAllowed";
    };

type PendingCard = {
  confirmationId: string;
  tool: string;
  args?: unknown;
  fields?: string[];
  preview?: unknown;
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
    ...(typeof card.preview === "string" ? { preview: card.preview } : {}),
    state: "open",
  };
}

/** A freelance tool result as a chat entry, or null for other kinds. */
function freelanceEntry(kind: unknown, data: unknown): Entry | null {
  if (kind === "freelance_tasks" && Array.isArray(data)) {
    return {
      key: nextKey(),
      kind: "freelance_tasks",
      tasks: data as FreelanceTaskCardItem[],
    };
  }
  if (kind === "freelance_task_proposal") {
    const id = (data as { id?: unknown } | null)?.id;
    if (typeof id === "string" && UUID.test(id)) {
      return {
        key: nextKey(),
        kind: "freelance_link",
        href: `/freelance/tasks/${id}`,
        link: "task",
      };
    }
  }
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
  if (kind === "ugc_campaign" && typeof id === "string" && UUID.test(id)) {
    return {
      key: nextKey(),
      kind: "freelance_link",
      href: `/campaigns/${id}`,
      link: "ugcCampaign",
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

type HistoryMessage = {
  id: string;
  role: string;
  content: string;
  /** `role: "ui"`: a block kept with the thread (D523). */
  block?: unknown;
  done?: string[];
};

/** A block from the server, drawn only in a format this chat knows. */
function blockOf(value: unknown): UiBlock | null {
  const block = value as Partial<UiBlock> | null;
  return block &&
    block.v === UI_VERSION &&
    typeof block.id === "string" &&
    UI_COMPONENTS.includes(block.component as never) &&
    Array.isArray(block.actions)
    ? (block as UiBlock)
    : null;
}

/** What the thread is about, from `GET /api/bot/conversation` (D525). */
type ServerFocus = {
  job?: { id: string; title: string; company: string };
  ugcProduct?: string;
  freelanceTitle?: string;
};

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
  fromFreelanceSell = false,
  fromPostJob = false,
  campaignId,
  inviteId,
  focus,
  ugcProduct,
  serviceId,
  orderId,
  confirmId,
  freelanceTitle,
  freelanceCopy = {},
  variant = "page",
  section,
}: {
  signedIn: boolean;
  /**
   * `page` is the `/chat` page; `panel` lives in the Spoki panel of the
   * layout (D525), which owns the title, the position and the phone screen.
   */
  variant?: "page" | "panel";
  /** The part of the site the person has open, sent with each message (D525). */
  section?: PageSection;
  jobId?: string;
  /** `/chat?service=`, `/chat?order=` and `/chat?confirm=` (D460). */
  serviceId?: string;
  orderId?: string;
  confirmId?: string;
  freelanceTitle?: string;
  /** `chatFreelance` messages, only on the chat page (D462). */
  freelanceCopy?: FreelanceCardCopy;
  /** Opened from the Services page. The server owns the prompt text (D423). */
  fromServices?: boolean;
  /** Opened to write a creative-test brief (D457). */
  fromCampaigns?: boolean;
  /** Opened to write a freelance listing (D493). */
  fromFreelanceSell?: boolean;
  /** Opened to write a job listing (D494). */
  fromPostJob?: boolean;
  campaignId?: string;
  inviteId?: string;
  focus?: { title: string; company: string };
  ugcProduct?: string;
}) {
  const t = useTranslations("chat");
  const goalText = useTranslations("chat.jobGoal");
  const ugcText = useTranslations("ugc");
  const explain = useTranslations("explain");
  const locale = useLocale();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [lane, setLane] = useState<StarterLane>("find");
  const [starterSeed, setStarterSeed] = useState(1);
  const [noJobsFound, setNoJobsFound] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  /** The tool Spoki runs right now, named in the status line (D490). */
  const [activity, setActivity] = useState<string | null>(null);
  /** The thread's subject from the server, when the address named none (D525). */
  const [serverFocus, setServerFocus] = useState<ServerFocus | null>(null);
  const [jobGoal, setJobGoal] = useState<JobGoal | null>(null);
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const goalSessionRef = useRef<string | null>(null);
  const [actions, setActions] = useState<ChatActions>({
    signup: false,
    fillChoice: false,
    profileReview: false,
  });
  const endRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  /** Empty chat sits mid-screen; a started conversation pins the field to the bottom. */
  const welcome = entries.length === 0;
  const suggestionMessages = entries.flatMap((entry) =>
    entry.kind === "user" || entry.kind === "assistant"
      ? [{ id: entry.key, role: entry.kind, text: entry.text }]
      : [],
  );

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
    } else if (fromFreelanceSell) {
      params.set("from", "freelance_sell");
      params.set("locale", locale);
    } else if (fromPostJob) {
      params.set("from", "post_job");
      params.set("locale", locale);
    } else if (serviceId) {
      params.set("service", serviceId);
      params.set("locale", locale);
    } else if (confirmId) {
      params.set("confirm", confirmId);
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";
    try {
      let marker = sessionStorage.getItem("spoki_goal_session");
      if (!marker) {
        marker = crypto.randomUUID();
        sessionStorage.setItem("spoki_goal_session", marker);
      }
      goalSessionRef.current = marker;
    } catch {
      goalSessionRef.current = null;
    }
    fetch(`/api/bot/conversation${query}`, {
      headers: goalSessionRef.current
        ? { "x-spoki-goal-session": goalSessionRef.current }
        : {},
    })
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
            jobGoal?: JobGoal | null;
            focus?: ServerFocus;
            /** The page of the next UGC step (D467). */
            next?: { href: string; link: string } | null;
            briefDraft?: {
              id: string;
              draft: Record<string, unknown>;
              assumptions: string[];
              missingRequired: string[];
            } | null;
            freelanceDraft?: {
              id: string;
              draft: Record<string, unknown>;
              missingRequired: string[];
            } | null;
            jobDraft?: {
              id: string;
              draft: Record<string, unknown>;
              missingRequired: string[];
              formMissingRequired: string[];
            } | null;
          } | null,
        ) => {
          if (!body) return;
          if (body.actions) setActions(body.actions);
          setJobGoal(body.jobGoal ?? null);
          if (body.focus) setServerFocus(body.focus);
          const history: Entry[] = body.messages.map((message) =>
            message.role === "ui" && blockOf(message.block)
              ? {
                  key: `ui-${blockOf(message.block)!.id}`,
                  kind: "ui",
                  block: blockOf(message.block)!,
                  done: Array.isArray(message.done) ? message.done : [],
                }
              : message.role === "assistant"
                ? {
                    key: message.id,
                    kind: "assistant",
                    text: message.content,
                    messageId: message.id,
                  }
                : {
                    key: message.id,
                    kind: message.role === "user" ? "user" : "event",
                    text: message.content,
                  },
          );
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
          const next = body.next;
          if (
            next &&
            next.href.startsWith("/") &&
            (next.link === "ugcDeposit" ||
              next.link === "ugcCampaign" ||
              next.link === "ugcPayout")
          ) {
            history.push({
              key: `next-${next.link}`,
              kind: "freelance_link",
              href: next.href,
              link: next.link,
            });
          }
          // A draft card carries the link to the form: in the history only
          // once the draft is complete (D514); Spoki's text shows progress.
          if (body.briefDraft && body.briefDraft.missingRequired.length === 0)
            history.push({
              key: `ugc-draft-${body.briefDraft.id}`,
              kind: "ugc_brief_draft",
              draftId: body.briefDraft.id,
              missing: body.briefDraft.missingRequired.length,
              draft: body.briefDraft.draft,
              assumptions: body.briefDraft.assumptions,
            });
          if (
            body.freelanceDraft &&
            body.freelanceDraft.missingRequired.length === 0
          )
            history.push({
              key: `freelance-draft-${body.freelanceDraft.id}`,
              kind: "freelance_service_draft",
              draftId: body.freelanceDraft.id,
              missing: body.freelanceDraft.missingRequired.length,
              draft: body.freelanceDraft.draft,
            });
          if (body.jobDraft && body.jobDraft.missingRequired.length === 0)
            history.push({
              key: `job-draft-${body.jobDraft.id}`,
              kind: "job_draft",
              draftId: body.jobDraft.id,
              missing:
                body.jobDraft.missingRequired.length +
                body.jobDraft.formMissingRequired.length,
              draft: body.jobDraft.draft,
            });
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
    fromFreelanceSell,
    fromPostJob,
    campaignId,
    inviteId,
    serviceId,
    orderId,
    confirmId,
    locale,
  ]);

  // D514: the log follows new text only while the person is at the end;
  // reading higher up is not interrupted, a button brings them back.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
    useStickToBottom({
      initial: "instant",
      resize: reducedMotion ? "instant" : "smooth",
    });
  const abortRef = useRef<AbortController | null>(null);
  const [answerTyping, setAnswerTyping] = useState(false);
  const lastKey = entries[entries.length - 1]?.key;
  // "Retry" asks the person's last question once more (D514).
  const retryText = sending
    ? null
    : ((
        entries.findLast((entry) => entry.kind === "user") as
          { text: string } | undefined
      )?.text ?? null);

  useEffect(() => {
    const root = document.documentElement;
    const narrow = window.matchMedia("(max-width: 767px)");
    let phase: KeyboardPhase = { open: false, sawKeyboard: false };

    function sync() {
      const viewport = window.visualViewport;
      const covered =
        viewport != null &&
        keyboardOverlaps(window.innerHeight, viewport.height, viewport.scale);
      const wasOpen = phase.open;
      phase = nextKeyboardPhase(phase, {
        narrow: narrow.matches,
        covered,
        writing: document.activeElement === fieldRef.current,
      });
      if (phase.open) {
        root.dataset.keyboard = "";
        // The chat sits on the part of the page the keyboard leaves (D468).
        root.style.setProperty("--vv-top", `${viewport?.offsetTop ?? 0}px`);
        root.style.setProperty(
          "--vv-height",
          `${viewport?.height ?? window.innerHeight}px`,
        );
      } else {
        delete root.dataset.keyboard;
        root.style.removeProperty("--vv-top");
        root.style.removeProperty("--vv-height");
      }
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
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      narrow.removeEventListener("change", sync);
      window.removeEventListener("focusin", sync, true);
      window.removeEventListener("focusout", sync, true);
    };
  }, []);

  const add = (entry: Entry) => setEntries((current) => [...current, entry]);
  /** A draft card has one place: a newer one replaces it at the end. */
  const put = (entry: Entry) =>
    setEntries((current) => [
      ...current.filter((row) => row.key !== entry.key),
      entry,
    ]);

  /** Appends streamed text to the answer in progress, or starts one. */
  function appendAnswer(key: string, chunk: string, messageId?: string) {
    setEntries((current) => {
      const last = current[current.length - 1];
      if (last && last.kind === "assistant" && last.key === key) {
        return [
          ...current.slice(0, -1),
          {
            ...last,
            text: last.text + chunk,
            messageId: messageId ?? last.messageId,
          },
        ];
      }
      return [
        ...current,
        { key, kind: "assistant", text: chunk, live: true, messageId },
      ];
    });
  }

  async function ask(message: string) {
    if (!message || sending) return false;
    setNoJobsFound(false);
    setText("");
    fieldRef.current?.focus();
    add({ key: nextKey(), kind: "user", text: message });
    return streamTurn("/api/bot/message", {
      text: message,
      locale,
      ...(section ? { section } : {}),
      ...(fromServices ? { from: "services" as const } : {}),
      ...(fromCampaigns ? { from: "campaigns" as const } : {}),
      ...(fromFreelanceSell ? { from: "freelance_sell" as const } : {}),
      ...(fromPostJob ? { from: "post_job" as const } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(inviteId ? { inviteId } : {}),
    });
  }

  async function changeJobGoal(action: JobGoalAction) {
    if (goalBusy || sending) return;
    setGoalBusy(true);
    setGoalError(false);
    try {
      const response = await fetch("/api/bot/goal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(goalSessionRef.current
            ? { "x-spoki-goal-session": goalSessionRef.current }
            : {}),
        },
        body: JSON.stringify(action),
      });
      if (!response.ok) throw new Error("Goal update failed");
      const result = (await response.json()) as { goal: JobGoal | null };
      setJobGoal(result.goal);
      if (
        action.action === "start" ||
        action.action === "filters" ||
        action.action === "resume" ||
        action.action === "skip_profile"
      ) {
        void ask(goalText("searchPrompt"));
      }
    } catch {
      setGoalError(true);
    } finally {
      setGoalBusy(false);
    }
  }

  function selectSuggestion(prompt: string) {
    if (prompt === t("internetFallbackYes")) {
      add({ key: nextKey(), kind: "user", text: prompt });
      add({
        key: nextKey(),
        kind: "assistant",
        text: t("internetSearchUnavailable"),
      });
      setNoJobsFound(false);
      return;
    }
    void ask(prompt);
  }

  /**
   * Spoki's own turn after a card is answered (D515): what happened and
   * the next step. Silent when the server refuses it; the card line stays.
   */
  function continueAfterCard(confirmationId: string) {
    return streamTurn("/api/bot/continue", { confirmationId }, true);
  }

  /** Streams one Spoki turn into the chat. */
  async function streamTurn(url: string, payload: object, quiet = false) {
    void scrollToBottom();
    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);
    setThinking(true);
    setActivity(null);
    const answerKey = nextKey();
    const workKey = nextKey();
    let turnState: WorkState = "failed";
    let hadError = false;
    let jobsSeen = NO_JOBS_YET;
    add({ key: workKey, kind: "work", steps: [], state: "running" });
    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          ...(goalSessionRef.current
            ? { "x-spoki-goal-session": goalSessionRef.current }
            : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok || !response.body) {
        if (!quiet)
          add({
            key: nextKey(),
            kind: "notice",
            code: response.status === 429 ? "RATE_LIMITED" : "BOT_TRY_LATER",
          });
        return false;
      }
      for await (const data of readEvents(response.body)) {
        if (data.type === "tool_start" || data.type === "tool_end") {
          setEntries((current) =>
            current.map((entry) =>
              entry.key === workKey && entry.kind === "work"
                ? { ...entry, steps: advanceWork(entry.steps, data) }
                : entry,
            ),
          );
        }
        if (data.type === "model_fallback") {
          setEntries((current) =>
            current.map((entry) =>
              entry.key === workKey && entry.kind === "work"
                ? { ...entry, fallback: true }
                : entry,
            ),
          );
        }
        if (data.type === "tool_end") setActivity(null);
        if (data.type === "error") hadError = true;
        if (data.type === "done") turnState = hadError ? "failed" : "done";
        if (data.type === "job_goal") {
          setJobGoal((data.goal as JobGoal | null) ?? null);
        }
        if (data.type === "token") {
          setThinking(false);
          appendAnswer(
            answerKey,
            String(data.text),
            typeof data.messageId === "string" && UUID.test(data.messageId)
              ? data.messageId
              : undefined,
          );
        } else if (data.type === "ui") {
          const block = blockOf(data.block);
          if (block) {
            setThinking(false);
            // Job cards come as a block when interactive UI is on (D523).
            if (block.component === "job_cards") {
              jobsSeen = afterJobResults(jobsSeen, 1);
              setNoJobsFound(jobsSeen.offerWeb);
            }
            put({
              key: `ui-${block.id}`,
              kind: "ui",
              block,
              done: [],
              live: true,
            });
          }
        } else if (data.type === "tool_start") {
          setActivity(String(data.name));
          setThinking(true);
        } else if (
          data.type === "tool_result" &&
          (data.kind === "jobs" || data.kind === "matches")
        ) {
          setThinking(false);
          const jobs = Array.isArray(data.data) ? (data.data as JobCard[]) : [];
          jobsSeen = afterJobResults(jobsSeen, jobs.length);
          setNoJobsFound(jobsSeen.offerWeb);
          add({
            key: nextKey(),
            kind: data.kind,
            jobs,
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
        } else if (
          data.type === "tool_result" &&
          data.kind === "ugc_brief_draft"
        ) {
          const draft = data.data as {
            id?: unknown;
            missingRequired?: unknown;
            draft?: Record<string, unknown>;
            assumptions?: unknown;
            showCard?: unknown;
          };
          if (
            typeof draft.id === "string" &&
            UUID.test(draft.id) &&
            draftCardDue(draft.missingRequired, draft.showCard)
          ) {
            setThinking(false);
            put({
              key: `ugc-draft-${draft.id}`,
              kind: "ugc_brief_draft",
              draftId: draft.id,
              missing: Array.isArray(draft.missingRequired)
                ? draft.missingRequired.length
                : 0,
              draft: draft.draft ?? {},
              assumptions: Array.isArray(draft.assumptions)
                ? draft.assumptions.map(String)
                : [],
            });
          }
        } else if (data.type === "tool_result" && data.kind === "fill_choice") {
          const fill = (data.data as { kind?: unknown } | null)?.kind;
          if (isFillKind(fill)) {
            setThinking(false);
            add({ key: nextKey(), kind: "fill_choice", fill });
          }
        } else if (data.type === "tool_result" && data.kind === "offer") {
          const action = (data.data as { action?: unknown } | null)?.action;
          const fill = isOfferAction(action) ? fillKindOf(action) : null;
          if (fill) {
            setThinking(false);
            add({ key: nextKey(), kind: "fill_choice", fill });
          } else if (isOfferAction(action) && offerPath(action, signedIn)) {
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
              preview: data.preview,
            }),
            key: nextKey(),
          });
        } else if (data.type === "error") {
          setThinking(false);
          if (!quiet)
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
        } else if (
          data.type === "tool_result" &&
          data.kind === "freelance_service_draft"
        ) {
          const draft = data.data as {
            id?: unknown;
            missingRequired?: unknown;
            draft?: Record<string, unknown>;
            showCard?: unknown;
          };
          if (
            typeof draft.id === "string" &&
            UUID.test(draft.id) &&
            draftCardDue(draft.missingRequired, draft.showCard)
          ) {
            setThinking(false);
            put({
              key: `freelance-draft-${draft.id}`,
              kind: "freelance_service_draft",
              draftId: draft.id,
              missing: Array.isArray(draft.missingRequired)
                ? draft.missingRequired.length
                : 0,
              draft: draft.draft ?? {},
            });
          }
        } else if (data.type === "tool_result" && data.kind === "job_draft") {
          const draft = data.data as {
            id?: unknown;
            missingRequired?: unknown;
            formMissingRequired?: unknown;
            draft?: Record<string, unknown>;
            showCard?: unknown;
          };
          if (
            typeof draft.id === "string" &&
            UUID.test(draft.id) &&
            draftCardDue(draft.missingRequired, draft.showCard)
          ) {
            setThinking(false);
            put({
              key: `job-draft-${draft.id}`,
              kind: "job_draft",
              draftId: draft.id,
              missing:
                (Array.isArray(draft.missingRequired)
                  ? draft.missingRequired.length
                  : 0) +
                (Array.isArray(draft.formMissingRequired)
                  ? draft.formMissingRequired.length
                  : 0),
              draft: draft.draft ?? {},
            });
          }
        } else if (
          data.type === "tool_result" &&
          data.kind === "freelance_service_saved"
        ) {
          const saved = data.data as { id?: unknown };
          if (typeof saved.id === "string" && UUID.test(saved.id)) {
            setThinking(false);
            add({
              key: nextKey(),
              kind: "freelance_link",
              href: `/profile/freelance`,
              link: "cabinet",
            });
          }
        }
      }
    } catch {
      turnState = controller.signal.aborted ? "stopped" : "failed";
      if (controller.signal.aborted)
        add({ key: nextKey(), kind: "event", text: t("answer.stopped") });
      else if (!quiet)
        add({ key: nextKey(), kind: "notice", code: "BOT_TRY_LATER" });
    } finally {
      if (controller.signal.aborted) turnState = "stopped";
      setEntries((current) =>
        current.map((entry) =>
          entry.key === workKey && entry.kind === "work"
            ? { ...entry, state: turnState, steps: finishWork(entry.steps) }
            : entry,
        ),
      );
      abortRef.current = null;
      setThinking(false);
      setActivity(null);
      setSending(false);
    }
    return turnState === "done";
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
            error?: { code?: string; details?: { missing?: string[] } };
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
      // The real reason, not always "expired" (D515).
      const code = body?.error?.code;
      if (code === "CONFIRMATION_EXPIRED") return setState("expired");
      setState(code === "INVALID_TRANSITION" ? "notAllowed" : "failed");
      // A card that was taken and failed: Spoki says why and what instead.
      if (response) void continueAfterCard(confirmationId);
      return;
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
    void continueAfterCard(confirmationId);
  }

  /** Changes one block entry in place. */
  function patchBlock(
    key: string,
    patch: Partial<Extract<Entry, { kind: "ui" }>>,
  ) {
    setEntries((current) =>
      current.map((entry) =>
        entry.key === key && entry.kind === "ui"
          ? { ...entry, ...patch }
          : entry,
      ),
    );
  }

  /** A reply button: the line goes to Spoki as the person's message. */
  function blockReply(
    entry: Extract<Entry, { kind: "ui" }>,
    actionId: string,
    line: string,
  ) {
    if (sending) return;
    if (entry.block.component === "choice")
      patchBlock(entry.key, { done: [...entry.done, actionId] });
    void ask(line).then((completed) => {
      if (!completed && entry.block.component === "choice")
        patchBlock(entry.key, { done: entry.done });
    });
  }

  /** A server button (save, refresh): the server keeps what it does. */
  async function blockAct(
    entry: Extract<Entry, { kind: "ui" }>,
    actionId: string,
  ) {
    patchBlock(entry.key, { busy: actionId, note: undefined });
    const response = await fetch("/api/bot/ui/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blockId: entry.block.id, actionId }),
    }).catch(() => null);
    const body = response
      ? ((await response.json().catch(() => null)) as {
          kind?: string;
          block?: unknown;
          error?: { code?: string };
        } | null)
      : null;
    if (!response?.ok) {
      patchBlock(entry.key, {
        busy: undefined,
        note:
          response?.status === 401
            ? "signIn"
            : body?.error?.code === "BLOCK_STALE"
              ? "stale"
              : "failed",
      });
      return;
    }
    const fresh = body?.kind === "refreshed" ? blockOf(body.block) : null;
    if (fresh) {
      patchBlock(entry.key, {
        block: fresh,
        busy: undefined,
        done: [],
        values: undefined,
      });
      return;
    }
    patchBlock(entry.key, {
      busy: undefined,
      done: [...entry.done, actionId],
    });
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
      router.push("/profile/edit");
      return;
    }
    setActions((current) => ({ ...current, profileReview: true }));
  }

  const jobFocus =
    focus && jobId ? { id: jobId, ...focus } : (serverFocus?.job ?? null);
  const shownUgcProduct = ugcProduct ?? serverFocus?.ugcProduct;
  const shownFreelanceTitle = freelanceTitle ?? serverFocus?.freelanceTitle;
  const hasFocusLine = Boolean(
    jobFocus ||
    shownUgcProduct ||
    fromCampaigns ||
    shownFreelanceTitle ||
    fromServices,
  );
  const showJobGoal =
    Boolean(jobGoal) ||
    (!jobId &&
      !fromServices &&
      !fromCampaigns &&
      !fromFreelanceSell &&
      !fromPostJob &&
      !serviceId &&
      !orderId &&
      !campaignId &&
      !inviteId &&
      (variant === "page" || section === "jobs"));

  return (
    <FreelanceCopyContext.Provider value={freelanceCopy}>
      <div
        className={
          variant === "page"
            ? "chat-shell flex min-h-0 w-full flex-1 flex-col max-md:fixed max-md:inset-x-0 max-md:top-16 max-md:bottom-0 max-md:z-30 max-md:bg-bg"
            : "flex min-h-0 w-full flex-1 flex-col"
        }
      >
        <div
          data-chat-meta
          className={
            variant === "page" || hasFocusLine || showJobGoal
              ? "mx-auto w-full max-w-3xl shrink-0 px-4 py-3 md:px-6"
              : "hidden"
          }
        >
          {variant === "page" ? (
            <h1 className="text-sm font-medium">{t("title")}</h1>
          ) : null}
          {jobFocus ? (
            <p className="t-body-s mt-2 text-fg first:mt-0">
              {t("jobFocus.discussing", {
                title: jobFocus.title,
                company: jobFocus.company,
              })}{" "}
              <Link
                href={`/jobs/${jobFocus.id}`}
                className="underline underline-offset-4"
              >
                {t("jobFocus.back")}
              </Link>
            </p>
          ) : null}
          {shownUgcProduct ? (
            <p className="t-body-s mt-2 text-fg first:mt-0">
              {t("ugcFocus.line", { product: shownUgcProduct })}{" "}
              <Link
                href={campaignId ? `/campaigns/${campaignId}` : "/campaigns"}
                className="underline underline-offset-4"
              >
                {t("ugcFocus.back")}
              </Link>
            </p>
          ) : null}
          {fromCampaigns ? (
            <p className="t-body-s mt-2 text-fg first:mt-0">
              {t("ugcFocus.home")}{" "}
              <Link href="/campaigns" className="underline underline-offset-4">
                {t("ugcFocus.back")}
              </Link>
            </p>
          ) : null}
          {shownFreelanceTitle ? (
            <p className="t-body-s mt-2 text-fg first:mt-0">
              {cardText(freelanceCopy, "focus", { title: shownFreelanceTitle })}{" "}
              <Link
                href={orderId ? `/freelance/orders/${orderId}` : "/freelance"}
                className="underline underline-offset-4"
              >
                {cardText(freelanceCopy, "back")}
              </Link>
            </p>
          ) : null}
          {fromServices ? (
            <p className="t-body-s mt-2 text-fg first:mt-0">
              {t("serviceFocus.line")}{" "}
              <Link href="/services" className="underline underline-offset-4">
                {t("serviceFocus.back")}
              </Link>
            </p>
          ) : null}
          {historyReady && showJobGoal ? (
            <>
              <JobGoalPanel
                goal={jobGoal}
                signedIn={signedIn}
                busy={goalBusy || sending}
                onAction={changeJobGoal}
              />
              {goalError ? (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {goalText("error")}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-busy={answerTyping || undefined}
          aria-label={t("log")}
          className="min-h-0 flex-1 overflow-auto"
        >
          {/* The log itself is plain `overflow: auto` so the scroll-lock
              library sees wheel scrolling; sideways overflow is clipped here. */}
          <div
            ref={contentRef}
            className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 overflow-x-hidden px-4 md:px-6"
          >
            {welcome && (
              <div className="mt-auto flex w-full flex-col items-center gap-4 pb-2 text-center">
                <h2 className="text-2xl font-medium md:text-3xl">
                  {fromServices
                    ? t("serviceFocus.line")
                    : fromCampaigns
                      ? t("ugcFocus.home")
                      : fromPostJob
                        ? t("jobDraft.title")
                        : t("welcome")}
                </h2>
                {fromServices ||
                fromCampaigns ||
                fromFreelanceSell ||
                fromPostJob ? null : (
                  <p className="t-body-s max-w-md text-fg-muted">
                    {signedIn ? t("emptySignedIn") : t("emptyGuest")}
                  </p>
                )}
                {historyReady &&
                  !jobId &&
                  !fromServices &&
                  !fromCampaigns &&
                  !fromFreelanceSell &&
                  !fromPostJob && (
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
                      <ChatSuggestions
                        messages={suggestionMessages}
                        isRunning={sending}
                        onSelect={selectSuggestion}
                        prompts={[
                          {
                            id: "platform-search",
                            text: t("searchPlatform"),
                          },
                          ...pickStarterKeys(
                            STARTER_KEYS[lane],
                            STARTER_SHOW,
                            starterSeed,
                          ).map((key) => ({
                            id: key,
                            text: t(`starters.questions.${key}`),
                          })),
                        ]}
                      />
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
                    <AssistantAnswer
                      text={entry.text}
                      live={entry.live === true}
                      messageId={entry.messageId}
                      onRetry={
                        retryText && entry.key === lastKey
                          ? () => void ask(retryText)
                          : undefined
                      }
                      onTyping={setAnswerTyping}
                    />
                  </div>
                );
              }
              if (entry.kind === "event") {
                const stopped =
                  retryText &&
                  entry.key === lastKey &&
                  entry.text === t("answer.stopped");
                return (
                  <div key={entry.key} className="flex flex-col items-start">
                    <p className="t-body-s text-fg-muted">{entry.text}</p>
                    {stopped ? (
                      <button
                        type="button"
                        onClick={() => void ask(retryText)}
                        className="mt-1 -ml-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
                      >
                        <Icon icon={RotateCcw} size={16} />
                        {t("answer.retry")}
                      </button>
                    ) : null}
                  </div>
                );
              }
              if (entry.kind === "work") {
                return (
                  <WorkProgressCard
                    key={entry.key}
                    steps={entry.steps}
                    state={entry.state}
                    fallback={entry.fallback ?? false}
                  />
                );
              }
              if (entry.kind === "ui") {
                return (
                  <SpokiBlock
                    key={entry.key}
                    block={entry.block}
                    live={entry.live}
                    note={entry.note}
                    values={entry.values}
                    onValues={(values) => patchBlock(entry.key, { values })}
                    handlers={{
                      reply: (actionId, line) =>
                        blockReply(entry, actionId, line),
                      act: (actionId) => void blockAct(entry, actionId),
                      busy: entry.busy ?? null,
                      done: entry.done,
                      sending,
                      edit: () => fieldRef.current?.focus(),
                    }}
                  />
                );
              }
              if (entry.kind === "jobs" || entry.kind === "matches") {
                if (entry.jobs.length === 0) return null;
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
                              {t("score", {
                                score: Math.round(job.score * 100),
                              })}
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
              if (entry.kind === "ugc_brief_draft") {
                return (
                  <div
                    key={entry.key}
                    className="flex max-w-md flex-col items-start gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3"
                  >
                    <p className="font-medium">{t("ugcDraft.title")}</p>
                    <dl className="grid gap-1 text-sm">
                      {(
                        [
                          ["productName", entry.draft.productName],
                          ["description", entry.draft.description],
                          ["goal", entry.draft.goal],
                          ["audience", entry.draft.audience],
                          ["countries", entry.draft.countries],
                          ["languages", entry.draft.languages],
                          ["platform", entry.draft.platform],
                          ["niche", entry.draft.niche],
                          ["videoCount", entry.draft.videoCount],
                          ["rewardCents", entry.draft.rewardCents],
                          ["deadline", entry.draft.deadline],
                          ["rights", entry.draft.rights],
                          ["mustSay", entry.draft.mustSay],
                          ["mustNot", entry.draft.mustNot],
                          ["pitch", entry.draft.pitch],
                          ["links", entry.draft.links],
                        ] as const
                      )
                        .filter(
                          ([, value]) =>
                            value !== undefined &&
                            value !== null &&
                            value !== "" &&
                            (!Array.isArray(value) || value.length > 0),
                        )
                        .map(([field, value]) => (
                          <div key={field} className="flex flex-wrap gap-x-2">
                            <dt className="text-fg-muted">
                              {t(`ugcDraft.fields.${field}` as never)}:
                            </dt>
                            <dd>
                              {field === "rewardCents"
                                ? new Intl.NumberFormat(locale, {
                                    style: "currency",
                                    currency: "USD",
                                  }).format(Number(value) / 100)
                                : Array.isArray(value)
                                  ? value.join(", ")
                                  : String(value)}
                            </dd>
                          </div>
                        ))}
                    </dl>
                    {entry.assumptions.length > 0 ? (
                      <p className="t-body-s text-fg-muted">
                        {t("ugcDraft.assumptions")}:{" "}
                        {entry.assumptions
                          .map((value) =>
                            t(
                              `ugcDraft.fields.${value.split(":")[0]}` as never,
                            ),
                          )
                          .join(", ")}
                      </p>
                    ) : null}
                    <p className="t-body-s text-fg-muted">
                      {t("ugcDraft.missing", { count: entry.missing })}
                    </p>
                    <Link
                      href={`/campaigns/new?draft=${entry.draftId}`}
                      className="inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-bg"
                    >
                      {t("ugcDraft.edit")}
                    </Link>
                  </div>
                );
              }
              if (entry.kind === "freelance_service_draft") {
                return (
                  <div
                    key={entry.key}
                    className="flex max-w-md flex-col items-start gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3"
                  >
                    <p className="font-medium">{t("freelanceDraft.title")}</p>
                    <dl className="grid gap-1 text-sm">
                      {(
                        [
                          "title",
                          "category",
                          "description",
                          "buyerNeeds",
                          "languages",
                          "skills",
                          "packages",
                        ] as const
                      )
                        .filter(
                          (field) =>
                            entry.draft[field] !== undefined &&
                            entry.draft[field] !== null &&
                            entry.draft[field] !== "",
                        )
                        .map((field) => (
                          <div key={field} className="flex flex-wrap gap-x-2">
                            <dt className="text-fg-muted">
                              {t(`freelanceDraft.fields.${field}` as never)}:
                            </dt>
                            <dd>
                              {Array.isArray(entry.draft[field])
                                ? JSON.stringify(entry.draft[field])
                                : String(entry.draft[field])}
                            </dd>
                          </div>
                        ))}
                    </dl>
                    <p className="t-body-s text-fg-muted">
                      {t("freelanceDraft.missing", { count: entry.missing })}
                    </p>
                    <Link
                      href={`/profile/freelance/new?draft=${entry.draftId}`}
                      className="inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-bg"
                    >
                      {t("freelanceDraft.edit")}
                    </Link>
                  </div>
                );
              }
              if (entry.kind === "job_draft") {
                const fields = [
                  "companyName",
                  "title",
                  "description",
                  "category",
                  "employmentType",
                  "location",
                  "salaryMin",
                  "salaryMax",
                  "salaryCurrency",
                  "salaryPeriod",
                  "applicationMethod",
                  "countries",
                ] as const;
                return (
                  <div
                    key={entry.key}
                    className="flex max-w-md flex-col items-start gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3"
                  >
                    <p className="font-medium">{t("jobDraft.title")}</p>
                    <dl className="grid gap-1 text-sm">
                      {fields
                        .filter((field) => {
                          const value = entry.draft[field];
                          return (
                            value !== undefined &&
                            value !== null &&
                            value !== ""
                          );
                        })
                        .map((field) => {
                          const value = entry.draft[field];
                          return (
                            <div key={field} className="flex flex-wrap gap-x-2">
                              <dt className="text-fg-muted">
                                {t(`jobDraft.fields.${field}` as never)}:
                              </dt>
                              <dd>
                                {Array.isArray(value)
                                  ? value.join(", ")
                                  : String(value)}
                              </dd>
                            </div>
                          );
                        })}
                    </dl>
                    <p className="t-body-s text-fg-muted">
                      {t("jobDraft.missing", { count: entry.missing })}
                    </p>
                    <Link
                      href={`/post-job?draft=${entry.draftId}`}
                      className="inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-bg"
                    >
                      {t("jobDraft.edit")}
                    </Link>
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
              if (entry.kind === "freelance_tasks") {
                return (
                  <FreelanceTaskCards key={entry.key} items={entry.tasks} />
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
              if (entry.kind === "fill_choice") {
                const paths = fillPaths(entry.fill, signedIn);
                const chatLabel = t("fillChoice.chat");
                const primary =
                  "inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-bg";
                return (
                  <div
                    key={entry.key}
                    className="flex max-w-md flex-col items-start gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {t("fillChoice.title", {
                          what: t(`fillChoice.what.${entry.fill}`),
                        })}
                      </p>
                      <p className="t-body-s text-fg-muted">
                        {t("fillChoice.text")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {paths.chat ? (
                        <a
                          href={localePath(locale, paths.chat)}
                          className={primary}
                        >
                          {chatLabel}
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled={sending}
                          className={primary}
                          onClick={() =>
                            entry.fill === "profile"
                              ? void chooseFill("spoki")
                              : void ask(t(`fillChoice.reply.${entry.fill}`))
                          }
                        >
                          {chatLabel}
                        </button>
                      )}
                      <a
                        href={localePath(locale, paths.form)}
                        className="inline-flex min-h-11 items-center rounded-full border border-line px-5"
                      >
                        {t("fillChoice.form")}
                      </a>
                    </div>
                  </div>
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
                  <div key={entry.key} className="flex flex-col items-start">
                    <Alert tone="warning">
                      {entry.code.startsWith("missing:")
                        ? t("confirm.missing", { fields: entry.code.slice(8) })
                        : ERROR_CODES.has(entry.code)
                          ? t(`errors.${entry.code}`)
                          : t("errors.generic")}
                    </Alert>
                    {retryText &&
                    entry.key === lastKey &&
                    !entry.code.startsWith("missing:") &&
                    entry.code !== "RATE_LIMITED" ? (
                      <button
                        type="button"
                        onClick={() => void ask(retryText)}
                        className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
                      >
                        <Icon icon={RotateCcw} size={16} />
                        {t("answer.retry")}
                      </button>
                    ) : null}
                  </div>
                );
              }
              if (entry.kind !== "confirm") return null;
              if (entry.state === "open" || entry.state === "busy") {
                return (
                  <ConfirmCard
                    key={entry.key}
                    title={
                      isFreelanceCardTool(entry.tool)
                        ? cardText(freelanceCopy, `${entry.tool}.title`)
                        : isAccountCardTool(entry.tool)
                          ? t("account.title")
                          : entry.tool === "confirm_brief"
                            ? t("confirm.briefTitle")
                            : entry.tool === "confirm_service_draft"
                              ? t("confirm.serviceTitle")
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
                      decide(
                        entry.key,
                        entry.confirmationId,
                        true,
                        entry.values,
                      )
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
                          preview={entry.preview}
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
                    ) : entry.tool === "apply_to_job" ? (
                      <ApplyCardText
                        args={entry.args}
                        preview={entry.preview}
                        noteLabel={t("confirm.applyNote")}
                        fallback={t("confirm.text")}
                      />
                    ) : isAccountCardTool(entry.tool) ? (
                      <AccountCardText
                        tool={entry.tool}
                        args={entry.args}
                        preview={entry.preview}
                      />
                    ) : entry.tool === "propose_ugc_campaign" ? (
                      <UgcBudgetLine args={entry.args} text={ugcText} />
                    ) : (entry.tool === "confirm_brief" ||
                        entry.tool === "confirm_service_draft") &&
                      entry.preview ? (
                      <span className="flex flex-col gap-1">
                        <span className="font-medium text-fg">
                          {entry.preview}
                        </span>
                        <span>{t("confirm.sendText")}</span>
                      </span>
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
            {noJobsFound && !sending && (
              <div className="flex w-full flex-col gap-3 rounded-lg border border-line p-4">
                <p className="text-sm text-fg-muted">
                  {t("internetFallbackQuestion")}
                </p>
                <ChatSuggestions
                  messages={suggestionMessages}
                  isRunning={sending}
                  onSelect={selectSuggestion}
                  prompts={[
                    { id: "internet-yes", text: t("internetFallbackYes") },
                    { id: "internet-no", text: t("internetFallbackNo") },
                  ]}
                />
              </div>
            )}
            {thinking && <ThinkingStatusLine tool={activity} />}
            <div ref={endRef} />
          </div>
          {isAtBottom ? null : (
            <div className="pointer-events-none sticky bottom-0 flex h-0 justify-center">
              <button
                type="button"
                onClick={() => void scrollToBottom()}
                className="pointer-events-auto flex size-11 -translate-y-14 items-center justify-center rounded-full border border-line bg-surface text-fg transition-colors duration-150 hover:bg-surface-2"
              >
                <Icon icon={ArrowDown} size={20} />
                <span className="sr-only">{t("answer.toBottom")}</span>
              </button>
            </div>
          )}
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
              href="/profile/edit"
              className="t-body-s underline underline-offset-4"
            >
              {t("reviewProfile")}
            </Link>
          )}
          <form
            onSubmit={send}
            className={`flex shrink-0 flex-col gap-2 ${welcome ? "max-md:pb-3" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]"}`}
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
              {sending ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fg text-bg"
                >
                  <Icon icon={Square} size={16} fill="currentColor" />
                  <span className="sr-only">{t("answer.stop")}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-signal text-signal-fg transition-opacity disabled:opacity-40"
                >
                  <Icon icon={ArrowUp} size={20} />
                  <span className="sr-only">{t("send")}</span>
                </button>
              )}
            </div>
          </form>
        </div>
        {welcome && (
          <div
            aria-hidden="true"
            className="min-h-0 flex-1 max-md:hidden [@media(max-height:520px)]:hidden"
          />
        )}
      </div>
    </FreelanceCopyContext.Provider>
  );
}

/** The brief card says the whole budget before it is saved (D464). */
function UgcBudgetLine({
  args,
  text,
}: {
  args: unknown;
  text: (key: string, values?: Record<string, string | number>) => string;
}) {
  const a = (args ?? {}) as { videosWanted?: unknown; bountyMinor?: unknown };
  const videos = Number(a.videosWanted);
  const reward =
    typeof a.bountyMinor === "string" && /^\d+$/.test(a.bountyMinor)
      ? Number(a.bountyMinor)
      : 0;
  const total = ugcBudgetMinor(videos, reward);
  if (total === 0) return null;
  return (
    <p className="font-mono">
      {text("budget", {
        videos,
        price: usdLabel(reward),
        total: usdLabel(total),
      })}
    </p>
  );
}
