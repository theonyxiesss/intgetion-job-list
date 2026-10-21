import { describe, expect, it } from "vitest";
import {
  attentionItems,
  campaignGroup,
  creatorsFrom,
  deskTotals,
  linkLabel,
  materialGroup,
  monogram,
  moneyTotals,
  orderGroup,
  pickGroup,
  videoPlatform,
  ORDER_GROUPS,
} from "../service/workspace-view";

type Status =
  "open" | "paused" | "draft" | "pending_review" | "closed" | "rejected";

function campaign(
  id: string,
  status: Status,
  next: "deposit" | "hire" | "decide" | "remind" | null,
  participants: {
    inviteId: string;
    status:
      "applied" | "offered" | "hired" | "declined" | "expired" | "withdrawn";
    creator: { userId: string } | null;
    submission: {
      status:
        "submitted" | "changes_requested" | "accepted" | "rejected" | "winner";
    } | null;
    payout: { amountMinor: string; status: "owed" | "paid" } | null;
  }[],
  deposit = {
    required: false,
    paid: false,
    deposit: null as { amountMinor: string } | null,
  },
  budgetMinor = 10_000,
) {
  return {
    id,
    productName: `Product ${id}`,
    status,
    budgetMinor,
    progress: { next },
    participants,
    deposit,
  };
}

const person = (
  inviteId: string,
  userId: string,
  status:
    "applied" | "offered" | "hired" | "declined" | "expired" | "withdrawn",
  submission:
    | "submitted"
    | "changes_requested"
    | "accepted"
    | "rejected"
    | "winner"
    | null = null,
  payout: { amountMinor: string; status: "owed" | "paid" } | null = null,
) => ({
  inviteId,
  status,
  creator: { userId },
  submission: submission ? { status: submission } : null,
  payout,
});

describe("UGC workspace grouping (D519)", () => {
  it("falls back to the first group on an unknown filter", () => {
    expect(pickGroup(ORDER_GROUPS, undefined)).toBe("applied");
    expect(pickGroup(ORDER_GROUPS, "nope")).toBe("applied");
    expect(pickGroup(ORDER_GROUPS, "done")).toBe("done");
  });

  it("groups briefs by where they stand without new statuses", () => {
    expect(campaignGroup("open")).toBe("active");
    expect(campaignGroup("paused")).toBe("active");
    expect(campaignGroup("draft")).toBe("review");
    expect(campaignGroup("pending_review")).toBe("review");
    expect(campaignGroup("closed")).toBe("closed");
    expect(campaignGroup("rejected")).toBe("closed");
  });

  it("puts a hired creator in progress until the video is decided", () => {
    expect(orderGroup({ status: "applied", submission: null })).toBe("applied");
    expect(orderGroup({ status: "offered", submission: null })).toBe("offered");
    expect(orderGroup({ status: "hired", submission: null })).toBe("active");
    expect(
      orderGroup({ status: "hired", submission: { status: "submitted" } }),
    ).toBe("active");
    expect(
      orderGroup({ status: "hired", submission: { status: "winner" } }),
    ).toBe("done");
    expect(orderGroup({ status: "expired", submission: null })).toBe("done");
  });

  it("files a winner with the accepted videos", () => {
    expect(materialGroup("submitted")).toBe("waiting");
    expect(materialGroup("changes_requested")).toBe("changes");
    expect(materialGroup("winner")).toBe("accepted");
    expect(materialGroup("rejected")).toBe("rejected");
  });

  it("reads the platform from the host only", () => {
    expect(videoPlatform("https://www.tiktok.com/@a/video/1")).toBe("tiktok");
    expect(videoPlatform("https://vm.tiktok.com/x")).toBe("tiktok");
    expect(videoPlatform("https://youtu.be/abc")).toBe("youtube");
    expect(videoPlatform("https://m.youtube.com/shorts/abc")).toBe("youtube");
    expect(videoPlatform("https://instagram.com/reel/1")).toBe("instagram");
    expect(videoPlatform("https://tiktok.com.evil.test/x")).toBe("other");
    expect(videoPlatform("not a url")).toBe("other");
  });

  it("shortens a link and makes initials", () => {
    expect(linkLabel("https://www.tiktok.com/@a/")).toBe("tiktok.com/@a");
    expect(linkLabel(`https://youtube.com/${"x".repeat(80)}`)).toHaveLength(48);
    expect(monogram("Анна Смирнова")).toBe("АС");
    expect(monogram("  ")).toBe("?");
  });

  it("counts only rows that exist", () => {
    const rows = [
      campaign("a", "open", "decide", [
        person("1", "u1", "hired", "submitted"),
        person("2", "u2", "applied"),
      ]),
      campaign("b", "pending_review", null, []),
      campaign("c", "closed", null, [person("3", "u1", "hired", "winner")]),
    ];
    expect(deskTotals(rows)).toEqual({
      active: 1,
      review: 1,
      closed: 1,
      applied: 1,
      offered: 0,
      hired: 2,
      waiting: 1,
      accepted: 1,
    });
  });

  it("lists what waits on the company, videos to decide first", () => {
    const items = attentionItems([
      campaign("a", "open", "hire", [
        person("1", "u1", "applied"),
        person("2", "u2", "applied"),
      ]),
      campaign("b", "open", "decide", [
        person("3", "u3", "hired", "submitted"),
      ]),
      campaign("c", "open", null, []),
    ]);
    expect(
      items.map((item) => [item.kind, item.campaignId, item.count]),
    ).toEqual([
      ["decide", "b", 1],
      ["hire", "a", 2],
    ]);
  });

  it("sums stored money only", () => {
    const totals = moneyTotals([
      campaign(
        "a",
        "open",
        null,
        [
          person("1", "u1", "hired", "accepted", {
            amountMinor: "5000",
            status: "owed",
          }),
        ],
        { required: true, paid: true, deposit: { amountMinor: "10000" } },
      ),
      campaign(
        "b",
        "open",
        "deposit",
        [],
        {
          required: true,
          paid: false,
          deposit: null,
        },
        7_500,
      ),
      campaign("c", "closed", null, [
        person("2", "u2", "hired", "winner", {
          amountMinor: "2500",
          status: "paid",
        }),
      ]),
      campaign("d", "pending_review", null, [], {
        required: true,
        paid: false,
        deposit: null,
      }),
    ]);
    expect(totals).toEqual({
      depositedMinor: 10_000,
      awaitingMinor: 7_500,
      owedMinor: 5_000,
      paidMinor: 2_500,
    });
  });

  it("shows each creator once with all their briefs", () => {
    const people = creatorsFrom([
      campaign("a", "open", null, [
        person("1", "u1", "applied"),
        person("2", "u2", "offered"),
      ]),
      campaign("b", "open", null, [person("3", "u1", "hired")]),
    ]);
    expect(people.map((row) => [row.card.userId, row.rows.length])).toEqual([
      ["u1", 2],
      ["u2", 1],
    ]);
  });
});
