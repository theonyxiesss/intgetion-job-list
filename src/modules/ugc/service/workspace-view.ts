import type {
  UgcCampaignStatus,
  UgcParticipationStatus,
  UgcSubmissionStatus,
} from "@/config/ugc";

/**
 * How the company's UGC workspace groups rows it already has (D519). Pure:
 * no reads, no writes, no new statuses. Pages only sort what the service
 * returned into overview, campaigns, creators, orders, materials and
 * payments.
 */

export const DESK_SECTIONS = [
  "overview",
  "campaigns",
  "creators",
  "orders",
  "materials",
  "payments",
] as const;
export type DeskSection = (typeof DESK_SECTIONS)[number];

export const DESK_HREFS: Record<DeskSection, string> = {
  overview: "/campaigns",
  campaigns: "/campaigns/list",
  creators: "/campaigns/creators",
  orders: "/campaigns/orders",
  materials: "/campaigns/materials",
  payments: "/campaigns/payments",
};

export const CAMPAIGN_GROUPS = ["active", "review", "closed", "all"] as const;
export type CampaignGroup = (typeof CAMPAIGN_GROUPS)[number];

export const ORDER_GROUPS = ["applied", "offered", "active", "done"] as const;
export type OrderGroup = (typeof ORDER_GROUPS)[number];

export const MATERIAL_GROUPS = [
  "waiting",
  "changes",
  "accepted",
  "rejected",
] as const;
export type MaterialGroup = (typeof MATERIAL_GROUPS)[number];

export type VideoPlatform = "tiktok" | "instagram" | "youtube" | "other";

/** Pick a filter from the query; anything unknown falls back to the first. */
export function pickGroup<T extends string>(
  groups: readonly T[],
  raw: string | undefined,
): T {
  return groups.includes(raw as T) ? (raw as T) : groups[0];
}

export function campaignGroup(status: UgcCampaignStatus): CampaignGroup {
  if (status === "open" || status === "paused") return "active";
  if (status === "draft" || status === "pending_review") return "review";
  return "closed";
}

/** Where one participation sits on the orders board. */
export function orderGroup(row: {
  status: UgcParticipationStatus;
  submission: { status: UgcSubmissionStatus } | null;
}): OrderGroup {
  if (row.status === "applied") return "applied";
  if (row.status === "offered") return "offered";
  if (row.status === "hired") {
    const decided =
      row.submission?.status === "accepted" ||
      row.submission?.status === "winner" ||
      row.submission?.status === "rejected";
    return decided ? "done" : "active";
  }
  return "done";
}

export function materialGroup(status: UgcSubmissionStatus): MaterialGroup {
  if (status === "submitted") return "waiting";
  if (status === "changes_requested") return "changes";
  if (status === "accepted" || status === "winner") return "accepted";
  return "rejected";
}

/** The platform a review link points to, from its host only (27.10). */
export function videoPlatform(url: string): VideoPlatform {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return "instagram";
  }
  if (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com")
  ) {
    return "youtube";
  }
  return "other";
}

/** Host and path of a link, short enough for a tile; never fetched. */
export function linkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    const label = `${parsed.hostname.replace(/^www\./, "")}${path}`;
    return label.length > 48 ? `${label.slice(0, 47)}…` : label;
  } catch {
    return url.slice(0, 48);
  }
}

/** Up to two letters for a name tile; no photo is stored for creators. */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("");
  return letters.toLocaleUpperCase() || "?";
}

type DeskParticipant = {
  inviteId: string;
  status: UgcParticipationStatus;
  creator: { userId: string } | null;
  submission: { status: UgcSubmissionStatus } | null;
  payout: { amountMinor: string; status: "owed" | "paid" } | null;
};

type DeskCampaign = {
  id: string;
  productName: string;
  status: UgcCampaignStatus;
  budgetMinor: number;
  progress: { next: "deposit" | "hire" | "decide" | "remind" | null };
  participants: readonly DeskParticipant[];
  deposit: {
    required: boolean;
    paid: boolean;
    deposit: { amountMinor: string } | null;
  };
};

export type DeskTotals = {
  active: number;
  review: number;
  closed: number;
  applied: number;
  offered: number;
  hired: number;
  waiting: number;
  accepted: number;
};

/** Counts of rows the company already has. No reach, CPM or forecast. */
export function deskTotals(campaigns: readonly DeskCampaign[]): DeskTotals {
  const totals: DeskTotals = {
    active: 0,
    review: 0,
    closed: 0,
    applied: 0,
    offered: 0,
    hired: 0,
    waiting: 0,
    accepted: 0,
  };
  for (const campaign of campaigns) {
    totals[campaignGroup(campaign.status) as "active" | "review" | "closed"] +=
      1;
    for (const row of campaign.participants) {
      if (row.status === "applied") totals.applied += 1;
      if (row.status === "offered") totals.offered += 1;
      if (row.status === "hired") totals.hired += 1;
      if (row.submission?.status === "submitted") totals.waiting += 1;
      if (
        row.submission?.status === "accepted" ||
        row.submission?.status === "winner"
      ) {
        totals.accepted += 1;
      }
    }
  }
  return totals;
}

export type AttentionItem = {
  kind: "decide" | "hire" | "deposit" | "remind";
  campaignId: string;
  productName: string;
  count: number;
};

const ATTENTION_ORDER: Record<AttentionItem["kind"], number> = {
  decide: 0,
  deposit: 1,
  hire: 2,
  remind: 3,
};

/**
 * What waits on the company, one line per brief, from the same `next` the
 * step track uses (D464). Videos to decide come first.
 */
export function attentionItems(
  campaigns: readonly DeskCampaign[],
): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const campaign of campaigns) {
    const next = campaign.progress.next;
    if (!next) continue;
    const count =
      next === "decide"
        ? campaign.participants.filter(
            (row) => row.submission?.status === "submitted",
          ).length
        : next === "hire"
          ? campaign.participants.filter((row) => row.status === "applied")
              .length
          : next === "remind"
            ? campaign.participants.filter(
                (row) => row.status === "hired" && !row.submission,
              ).length
            : 1;
    items.push({
      kind: next,
      campaignId: campaign.id,
      productName: campaign.productName,
      count,
    });
  }
  return items.sort(
    (a, b) => ATTENTION_ORDER[a.kind] - ATTENTION_ORDER[b.kind],
  );
}

export type MoneyTotals = {
  /** Paid-in budgets that the server confirmed (D466). */
  depositedMinor: number;
  /** Rewards recorded for accepted videos and not yet marked paid. */
  owedMinor: number;
  /** Rewards an admin marked paid. */
  paidMinor: number;
  /** Open or paused briefs whose budget still waits for a deposit. */
  awaitingMinor: number;
};

export function moneyTotals(campaigns: readonly DeskCampaign[]): MoneyTotals {
  const totals: MoneyTotals = {
    depositedMinor: 0,
    owedMinor: 0,
    paidMinor: 0,
    awaitingMinor: 0,
  };
  for (const campaign of campaigns) {
    if (campaign.deposit.paid && campaign.deposit.deposit) {
      totals.depositedMinor += Number(campaign.deposit.deposit.amountMinor);
    } else if (
      campaign.deposit.required &&
      (campaign.status === "open" || campaign.status === "paused")
    ) {
      totals.awaitingMinor += campaign.budgetMinor;
    }
    for (const row of campaign.participants) {
      if (!row.payout) continue;
      if (row.payout.status === "paid") {
        totals.paidMinor += Number(row.payout.amountMinor);
      } else {
        totals.owedMinor += Number(row.payout.amountMinor);
      }
    }
  }
  return totals;
}

/** Each creator once, with every brief they take part in. */
export function creatorsFrom<
  K extends {
    participants: readonly { creator: { userId: string } | null }[];
  },
>(campaigns: readonly K[]) {
  type P = K["participants"][number];
  type C = NonNullable<P["creator"]>;
  const byId = new Map<
    string,
    { card: C; rows: { campaign: K; participant: P }[] }
  >();
  for (const campaign of campaigns) {
    for (const participant of campaign.participants as readonly P[]) {
      const card = participant.creator as C | null;
      if (!card) continue;
      const entry = byId.get(card.userId) ?? { card, rows: [] };
      entry.rows.push({ campaign, participant });
      byId.set(card.userId, entry);
    }
  }
  return [...byId.values()];
}
