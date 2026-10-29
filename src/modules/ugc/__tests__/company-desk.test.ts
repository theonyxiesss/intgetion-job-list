import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";

vi.mock("../repo/escrow-repo", () => ({
  latestDeposit: vi.fn(async () => null),
  latestDeposits: vi.fn(async () => new Map()),
}));

import {
  createCampaign,
  listMyCampaignSummaries,
  readCampaign,
  saveCreatorProfile,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput, Campaign } from "../service/records";
import { companyDeskPage, companyWorkspace } from "../service/workspace";

const COMPANY_A = "00000000-0000-4000-8000-0000000000a1";
const COMPANY_B = "00000000-0000-4000-8000-0000000000b1";
const COMPANY_C = "00000000-0000-4000-8000-0000000000c1";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const STRANGER = "00000000-0000-4000-8000-000000000009";
const niches: UgcNiche[] = ["app"];
const platforms: UgcPlatform[] = ["tiktok"];

function brief(
  companyId: string,
  name: string,
  deadline = "2099-10-20",
): BriefInput {
  return {
    companyId,
    productName: name,
    productSummary: "A small app",
    goal: "awareness",
    niches,
    audience: "People who try new apps",
    country: null,
    languages: ["en"],
    mustSay: "Say the name",
    mustNot: "Do not promise income",
    platforms,
    videosWanted: 3,
    bountyMinor: BigInt(1500),
    deadline,
    rights: "ads",
    pitch: "We would like a short video",
    exampleUrls: [],
  };
}

let store: MemoryUgcStore;
let creatorCount = 0;

/** Counts every store read so a test can see how reads grow. */
function counted(inner: MemoryUgcStore) {
  const calls: Record<string, number> = {};
  const proxy = new Proxy(inner, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || typeof prop !== "string") return value;
      return (...args: unknown[]) => {
        calls[prop] = (calls[prop] ?? 0) + 1;
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
  return {
    proxy,
    total: () => Object.values(calls).reduce((a, b) => a + b, 0),
  };
}

async function newCreator(index: number) {
  const id = `00000000-0000-4000-8000-${String(1000 + index).padStart(12, "0")}`;
  await saveCreatorProfile(id, {
    displayName: `Creator ${index}`,
    languages: ["en"],
    platforms,
    niches,
    country: null,
    exampleUrls: [],
    inviteOptIn: true,
    status: "active",
  });
  return id;
}

let seq = 0;
let template: Campaign | null = null;
function uuid(): string {
  seq += 1;
  return `00000000-0000-4000-8000-${String(900000 + seq).padStart(12, "0")}`;
}

/**
 * One open brief of a company with `creators` hired creators and one video,
 * written straight into the store: the commands are rate limited and this
 * test is about reads, not about writing.
 */
async function seed(companyId: string, name: string, creators: number) {
  // One brief goes through the command; the rest are copies, because the
  // command allows only a few briefs a day per company.
  if (!template) {
    const first = await createCampaign(MEMBER, brief(companyId, name));
    template = { ...store.campaigns.get(first.id)! };
    store.campaigns.delete(first.id);
  }
  const campaign = { ...template, id: uuid(), companyId, productName: name };
  campaign.status = "open";
  store.campaigns.set(campaign.id, campaign);
  const base = { id: campaign.id };
  for (let n = 0; n < creators; n += 1) {
    const creator = await newCreator(++creatorCount);
    const inviteId = uuid();
    store.invites.set(inviteId, {
      id: inviteId,
      campaignId: base.id,
      creatorUserId: creator,
      status: "hired",
      bountyMinor: BigInt(1500),
      rights: "ads",
      pitch: "Hello",
      reminders: 0,
      revisionUsed: false,
      deadlineNoted: false,
      offeredAt: new Date("2026-10-16T12:00:00.000Z"),
      createdAt: new Date("2026-10-16T12:00:00.000Z"),
    });
    if (n === 0) {
      const submissionId = uuid();
      store.submissions.set(submissionId, {
        id: submissionId,
        inviteId,
        url: "https://www.tiktok.com/@a/video/1",
        hook: "First line",
        status: "accepted",
        changeNote: "",
        liveUrl: null,
        reportedViews: null,
        reportedAt: null,
      });
      const payoutId = uuid();
      store.payouts.set(payoutId, {
        id: payoutId,
        submissionId,
        inviteId,
        amountMinor: BigInt(1500),
        status: "owed",
        paidAt: null,
        paidBy: null,
      });
    }
  }
  return base.id;
}

beforeEach(() => {
  creatorCount = 0;
  template = null;
  store = new MemoryUgcStore();
  store.companies = [
    { id: COMPANY_A, name: "Alpha", userId: MEMBER },
    { id: COMPANY_B, name: "Beta", userId: MEMBER },
  ];
  store.members = [
    { companyId: COMPANY_A, userId: MEMBER },
    { companyId: COMPANY_B, userId: MEMBER },
    { companyId: COMPANY_C, userId: STRANGER },
  ];
  useUgcStore(store);
});

describe("company workspace reads (U2, TZ 48)", () => {
  it("returns what the brief page and the summaries returned before", async () => {
    await seed(COMPANY_A, "North", 2);
    const [row] = await companyWorkspace(MEMBER);
    const view = await readCampaign(MEMBER, row.id);
    const [summary] = await listMyCampaignSummaries(MEMBER);
    expect(view.role).toBe("company");
    if (view.role !== "company") return;
    expect(row.brief).toEqual(view.brief);
    expect(row.participants).toEqual(view.participants);
    const head = {
      id: row.id,
      productName: row.productName,
      status: row.status,
      deadline: row.deadline,
      videosWanted: row.videosWanted,
      bountyMinor: row.bountyMinor,
      budgetMinor: row.budgetMinor,
      progress: row.progress,
    };
    expect(head).toEqual(summary);
  });

  it("does not read more when briefs and creators multiply", async () => {
    await seed(COMPANY_A, "One", 1);
    const small = counted(store);
    useUgcStore(small.proxy);
    await companyWorkspace(MEMBER);
    const base = small.total();
    useUgcStore(store);

    for (let n = 0; n < 6; n += 1) await seed(COMPANY_A, `Brief ${n}`, 3);
    const large = counted(store);
    useUgcStore(large.proxy);
    const rows = await companyWorkspace(MEMBER);
    expect(rows).toHaveLength(7);
    expect(rows.flatMap((row) => row.participants)).toHaveLength(19);
    expect(large.total()).toBe(base);
  });

  it("limits the reads to one company when it is chosen", async () => {
    await seed(COMPANY_A, "Alpha brief", 1);
    await seed(COMPANY_B, "Beta brief", 1);
    expect(
      (await companyWorkspace(MEMBER)).map((row) => row.productName).sort(),
    ).toEqual(["Alpha brief", "Beta brief"]);
    expect(
      (await companyWorkspace(MEMBER, { companyId: COMPANY_B })).map(
        (row) => row.productName,
      ),
    ).toEqual(["Beta brief"]);
  });

  it("never shows another company's briefs, even when its id is asked for", async () => {
    await seed(COMPANY_A, "Alpha brief", 1);
    store.companies.push({ id: COMPANY_C, name: "Gamma", userId: STRANGER });
    const created = await createCampaign(STRANGER, brief(COMPANY_C, "Secret"));
    expect(created.id).toBeTruthy();
    expect(await companyWorkspace(MEMBER, { companyId: COMPANY_C })).toEqual(
      [],
    );
    expect(
      (await companyWorkspace(MEMBER)).map((row) => row.productName),
    ).not.toContain("Secret");
  });
});

describe("briefs list page (U2, TZ 48 §4)", () => {
  it("pages the briefs and reads details only for the page", async () => {
    for (let n = 0; n < 12; n += 1) {
      await seed(COMPANY_A, `Brief ${String(n).padStart(2, "0")}`, 1);
    }
    const first = await companyDeskPage(MEMBER, { pageSize: 5 });
    expect(first.items).toHaveLength(5);
    expect(first.total).toBe(12);
    expect(first.groups).toMatchObject({ active: 12, all: 12 });
    const third = await companyDeskPage(MEMBER, { pageSize: 5, page: 3 });
    expect(third.items).toHaveLength(2);
    // A page past the end falls back to the last one.
    expect(
      (await companyDeskPage(MEMBER, { pageSize: 5, page: 99 })).page,
    ).toBe(3);
  });

  it("filters by status group and by a search word", async () => {
    await seed(COMPANY_A, "Mango app", 1);
    await seed(COMPANY_A, "Pear app", 1);
    const draft = await createCampaign(MEMBER, brief(COMPANY_A, "Draft only"));
    expect(draft.status).not.toBe("open");
    const found = await companyDeskPage(MEMBER, { search: "mango" });
    expect(found.items.map((row) => row.productName)).toEqual(["Mango app"]);
    const review = await companyDeskPage(MEMBER, { group: "review" });
    expect(review.items.map((row) => row.productName)).toEqual(["Draft only"]);
    const all = await companyDeskPage(MEMBER, { group: "all" });
    expect(all.total).toBe(3);
  });

  it("keeps the same number of reads for a bigger page", async () => {
    for (let n = 0; n < 3; n += 1) await seed(COMPANY_A, `Few ${n}`, 1);
    const a = counted(store);
    useUgcStore(a.proxy);
    await companyDeskPage(MEMBER, { pageSize: 10 });
    const base = a.total();
    useUgcStore(store);
    for (let n = 0; n < 8; n += 1) await seed(COMPANY_A, `More ${n}`, 2);
    const b = counted(store);
    useUgcStore(b.proxy);
    await companyDeskPage(MEMBER, { pageSize: 10 });
    expect(b.total()).toBe(base);
  });

  it("gives a stranger an empty page and a guest 401", async () => {
    await seed(COMPANY_A, "Alpha brief", 1);
    expect((await companyDeskPage(STRANGER)).total).toBe(0);
    await expect(companyDeskPage(null)).rejects.toMatchObject({ status: 401 });
  });
});
