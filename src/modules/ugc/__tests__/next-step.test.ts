import { describe, expect, it } from "vitest";
import {
  companyNextStep,
  creatorNextStep,
  type CompanySide,
  type CreatorSide,
} from "../service/next-step";

/** The one next step Spoki offers in a brief or an invite thread (D467). */

const CAMPAIGN = "00000000-0000-4000-8000-0000000000c1";
const ADA = "00000000-0000-4000-8000-0000000000a1";
const BEA = "00000000-0000-4000-8000-0000000000b1";

function company(over: Partial<CompanySide> = {}): CompanySide {
  return {
    campaign: {
      id: CAMPAIGN,
      status: "open",
      videosWanted: 2,
      bountyMinor: BigInt(1500),
      deadline: "2026-10-30",
    },
    today: "2026-10-16",
    escrow: true,
    depositMinor: BigInt(3000),
    invites: [],
    submissions: [],
    ...over,
  };
}

const invite = (
  id: string,
  status: string,
  creatorUserId: string,
  over: { bountyMinor?: bigint | null; reminders?: number } = {},
) =>
  ({
    id,
    status,
    creatorUserId,
    bountyMinor: over.bountyMinor ?? null,
    reminders: over.reminders ?? 0,
  }) as CompanySide["invites"][number];

describe("company next step (D467)", () => {
  it("asks for the budget first, before any offer", () => {
    const step = companyNextStep(
      company({
        depositMinor: null,
        invites: [invite("i1", "applied", ADA)],
      }),
    );
    expect(step).toEqual({
      kind: "deposit",
      key: `deposit:${CAMPAIGN}`,
      campaignId: CAMPAIGN,
    });
  });

  it("offers the oldest applicant when the budget has room", () => {
    const step = companyNextStep(
      company({
        invites: [invite("i1", "applied", ADA), invite("i2", "applied", BEA)],
      }),
    );
    expect(step).toMatchObject({ kind: "hire", creatorId: ADA });
  });

  it("does not offer past the paid budget or the video slots", () => {
    const full = company({
      depositMinor: BigInt(1500),
      invites: [
        invite("i1", "hired", ADA, { bountyMinor: BigInt(1500), reminders: 1 }),
        invite("i2", "applied", BEA),
      ],
      submissions: [{ inviteId: "i1", status: "accepted" }],
    });
    expect(companyNextStep(full)).toBeNull();
  });

  it("puts a waiting video before everything else", () => {
    const step = companyNextStep(
      company({
        depositMinor: null,
        invites: [
          invite("i1", "hired", ADA, { bountyMinor: BigInt(1500) }),
          invite("i2", "applied", BEA),
        ],
        submissions: [{ inviteId: "i1", status: "submitted" }],
      }),
    );
    expect(step).toMatchObject({ kind: "decide", inviteId: "i1" });
  });

  it("offers one reminder to a hire with no video", () => {
    const step = companyNextStep(
      company({
        invites: [invite("i1", "hired", ADA, { bountyMinor: BigInt(1500) })],
      }),
    );
    expect(step).toMatchObject({ kind: "remind", inviteId: "i1" });
    const reminded = company({
      invites: [
        invite("i1", "hired", ADA, { bountyMinor: BigInt(1500), reminders: 1 }),
      ],
    });
    expect(companyNextStep(reminded)).toBeNull();
  });

  it("hires without a budget while the wallet is off", () => {
    const step = companyNextStep(
      company({
        escrow: false,
        depositMinor: null,
        invites: [invite("i1", "applied", ADA)],
      }),
    );
    expect(step).toMatchObject({ kind: "hire", creatorId: ADA });
  });

  it("offers nothing on a closed brief or after the deadline", () => {
    const applied = [invite("i1", "applied", ADA)];
    expect(
      companyNextStep(
        company({
          campaign: { ...company().campaign, status: "closed" },
          invites: applied,
        }),
      ),
    ).toBeNull();
    expect(
      companyNextStep(company({ today: "2026-11-01", invites: applied })),
    ).toBeNull();
  });
});

function creator(over: Partial<CreatorSide> = {}): CreatorSide {
  return {
    campaign: { id: CAMPAIGN, status: "open", deadline: "2026-10-30" },
    today: "2026-10-16",
    invite: { id: "i1", status: "hired" },
    submission: null,
    payout: null,
    fromWallet: false,
    hasPayoutAddress: false,
    ...over,
  };
}

describe("creator next step (D467)", () => {
  it("accepts an offer, then hands in the video, then the one change", () => {
    expect(
      creatorNextStep(creator({ invite: { id: "i1", status: "offered" } })),
    ).toMatchObject({ kind: "accept", inviteId: "i1" });
    expect(creatorNextStep(creator())).toMatchObject({ kind: "submit" });
    expect(
      creatorNextStep(creator({ submission: { status: "changes_requested" } })),
    ).toMatchObject({ kind: "changes" });
    expect(
      creatorNextStep(creator({ submission: { status: "submitted" } })),
    ).toBeNull();
  });

  it("asks for a payout address only when the reward comes from the wallet", () => {
    const accepted = {
      submission: { status: "accepted" as const },
      payout: { status: "owed" as const },
    };
    expect(
      creatorNextStep(creator({ ...accepted, fromWallet: true })),
    ).toMatchObject({ kind: "payout" });
    expect(creatorNextStep(creator(accepted))).toBeNull();
    expect(
      creatorNextStep(
        creator({ ...accepted, fromWallet: true, hasPayoutAddress: true }),
      ),
    ).toBeNull();
  });

  it("does not ask for a video after the brief is closed", () => {
    expect(
      creatorNextStep(
        creator({
          campaign: { id: CAMPAIGN, status: "closed", deadline: "2026-10-30" },
        }),
      ),
    ).toBeNull();
  });
});
