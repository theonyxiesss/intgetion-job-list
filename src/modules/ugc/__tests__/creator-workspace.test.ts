import { describe, expect, it } from "vitest";
import {
  buildCreatorWorkspace,
  type WorkspaceInput,
} from "../service/creator-workspace";

const TODAY = "2026-10-29";

type Row = WorkspaceInput["rows"][number];

function row(overrides: {
  id: string;
  invite?: Partial<Row["invite"]>;
  campaign?: Partial<Row["campaign"]>;
  submission?: Row["submission"];
  payout?: Row["payout"];
}): Row {
  return {
    invite: {
      id: overrides.id,
      status: "hired",
      bountyMinor: BigInt(5000),
      ...overrides.invite,
    },
    campaign: {
      id: `campaign-${overrides.id}`,
      status: "open",
      productName: `Product ${overrides.id}`,
      deadline: "2026-11-05",
      ...overrides.campaign,
    },
    submission: overrides.submission ?? null,
    payout: overrides.payout ?? null,
  };
}

const stageOf = (r: Row) =>
  buildCreatorWorkspace({ today: TODAY, rows: [r] }).sections;

describe("creator workspace stages (TZ 48 §7)", () => {
  it("asks the creator to accept an offer while the brief is open", () => {
    const ws = buildCreatorWorkspace({
      today: TODAY,
      rows: [row({ id: "a", invite: { status: "offered" } })],
    });
    expect(ws.now).toHaveLength(1);
    expect(ws.now[0]).toMatchObject({ stage: "offer", action: "accept" });
    expect(ws.sections.offers).toHaveLength(1);
  });

  it("does not ask to accept an offer on a closed brief or past the deadline", () => {
    for (const campaign of [
      { status: "closed" as const },
      { deadline: "2026-10-01" },
    ]) {
      const ws = buildCreatorWorkspace({
        today: TODAY,
        rows: [row({ id: "a", invite: { status: "offered" }, campaign })],
      });
      expect(ws.now).toHaveLength(0);
      expect(ws.sections.done[0]).toMatchObject({ stage: "closed" });
    }
  });

  it("keeps a waiting application out of the 'now' list", () => {
    const ws = buildCreatorWorkspace({
      today: TODAY,
      rows: [row({ id: "a", invite: { status: "applied" } })],
    });
    expect(ws.now).toHaveLength(0);
    expect(ws.sections.offers[0]).toMatchObject({ stage: "applied" });
  });

  it("asks a hired creator to submit, then to send the change", () => {
    expect(
      buildCreatorWorkspace({ today: TODAY, rows: [row({ id: "a" })] }).now[0],
    ).toMatchObject({ stage: "submit", action: "submit" });
    expect(
      buildCreatorWorkspace({
        today: TODAY,
        rows: [row({ id: "a", submission: { status: "changes_requested" } })],
      }).now[0],
    ).toMatchObject({ stage: "changes", action: "send_changes" });
  });

  it("marks hired work past the deadline as overdue without an action", () => {
    const ws = buildCreatorWorkspace({
      today: TODAY,
      rows: [row({ id: "a", campaign: { deadline: "2026-10-20" } })],
    });
    expect(ws.now).toHaveLength(0);
    expect(ws.sections.in_progress[0]).toMatchObject({
      stage: "overdue",
      daysLeft: -9,
    });
  });

  it("waits on the client while a video is under review", () => {
    const sections = stageOf(
      row({ id: "a", submission: { status: "submitted" } }),
    );
    expect(sections.on_review[0]).toMatchObject({
      stage: "review",
      action: "none",
    });
  });

  it("separates accepted work waiting for a transfer from a confirmed payout", () => {
    const owed = stageOf(
      row({
        id: "a",
        submission: { status: "accepted" },
        payout: { status: "owed", amountMinor: BigInt(5000) },
      }),
    );
    const paid = stageOf(
      row({
        id: "b",
        submission: { status: "winner" },
        payout: { status: "paid", amountMinor: BigInt(7000) },
      }),
    );
    expect(owed.done[0]).toMatchObject({ stage: "payout_wait" });
    expect(paid.done[0]).toMatchObject({ stage: "paid" });
    expect(
      stageOf(row({ id: "c", submission: { status: "rejected" } })).done[0],
    ).toMatchObject({ stage: "rejected" });
  });
});

describe("creator workspace money and order", () => {
  it("adds owed and paid separately and never counts a balance", () => {
    const ws = buildCreatorWorkspace({
      today: TODAY,
      rows: [
        row({
          id: "a",
          submission: { status: "accepted" },
          payout: { status: "owed", amountMinor: BigInt(5000) },
        }),
        row({
          id: "b",
          submission: { status: "winner" },
          payout: { status: "paid", amountMinor: BigInt(7000) },
        }),
        row({ id: "c", invite: { status: "offered" } }),
      ],
    });
    expect(ws.money).toEqual({
      acceptedMinor: BigInt(12000),
      owedMinor: BigInt(5000),
      paidMinor: BigInt(7000),
    });
  });

  it("sorts what is needed now by the nearest deadline", () => {
    const ws = buildCreatorWorkspace({
      today: TODAY,
      rows: [
        row({ id: "later", campaign: { deadline: "2026-11-20" } }),
        row({ id: "soon", campaign: { deadline: "2026-10-30" } }),
        row({
          id: "mid",
          invite: { status: "offered" },
          campaign: { deadline: "2026-11-05" },
        }),
      ],
    });
    expect(ws.now.map((item) => item.inviteId)).toEqual([
      "soon",
      "mid",
      "later",
    ]);
    expect(ws.now[0].daysLeft).toBe(1);
  });

  it("returns an empty workspace for no rows", () => {
    expect(buildCreatorWorkspace({ today: TODAY, rows: [] })).toEqual({
      now: [],
      sections: { offers: [], in_progress: [], on_review: [], done: [] },
      money: {
        acceptedMinor: BigInt(0),
        owedMinor: BigInt(0),
        paidMinor: BigInt(0),
      },
    });
  });
});
