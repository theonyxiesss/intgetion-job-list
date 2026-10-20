import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listJobsForUser: vi.fn(),
  listOwnApplications: vi.fn(),
  listSavedJobsForUser: vi.fn(),
  listSavedSearches: vi.fn(),
  listMyCampaigns: vi.fn(),
  listMyInvites: vi.fn(),
  listOwnServices: vi.fn(),
  listOrders: vi.fn(),
  listPending: vi.fn(),
  billingMe: vi.fn(),
}));

vi.mock("@/modules/jobs/service", async (o) => ({
  ...(await o<object>()),
  listJobsForUser: mocks.listJobsForUser,
}));
vi.mock("@/modules/applications/service", async (o) => ({
  ...(await o<object>()),
  listOwnApplications: mocks.listOwnApplications,
}));
vi.mock("@/modules/feedback/service", async (o) => ({
  ...(await o<object>()),
  listSavedJobsForUser: mocks.listSavedJobsForUser,
}));
vi.mock("@/modules/saved-searches/service", async (o) => ({
  ...(await o<object>()),
  listSavedSearches: mocks.listSavedSearches,
}));
vi.mock("@/modules/ugc/service", async (o) => ({
  ...(await o<object>()),
  listMyCampaigns: mocks.listMyCampaigns,
  listMyInvites: mocks.listMyInvites,
}));
vi.mock("@/modules/freelance/service", async (o) => ({
  ...(await o<object>()),
  listOwnServices: mocks.listOwnServices,
  listOrders: mocks.listOrders,
}));
vi.mock("@/modules/billing/service", async (o) => ({
  ...(await o<object>()),
  billingMe: mocks.billingMe,
}));
vi.mock("../repo/reminder-repo", async (o) => ({
  ...(await o<object>()),
  listPending: mocks.listPending,
}));

const { offerPath } = await import("../service/offers");
const { systemPrompt } = await import("../prompts/system");
const { findTool, runTool, toolsFor } = await import("../service/tools");

const ctx = { userId: "u1", conversationId: "c1", locale: "ru", state: {} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listJobsForUser.mockResolvedValue(
    Array.from({ length: 7 }, (_, i) => ({
      job: {
        id: `j${i}`,
        title: `Job ${i}`,
        status: i < 5 ? "published" : "paused",
      },
      company: { name: "Acme" },
    })),
  );
  mocks.listOwnApplications.mockResolvedValue([
    { jobId: "x1", jobTitle: "Designer", status: "applied" },
  ]);
  mocks.listSavedJobsForUser.mockResolvedValue([]);
  mocks.listSavedSearches.mockResolvedValue([{ name: "Remote React" }]);
  mocks.listMyCampaigns.mockRejectedValue(new Error("db down"));
  mocks.listMyInvites.mockResolvedValue([]);
  mocks.listOwnServices.mockResolvedValue([
    { title: "Landing page", status: "paused" },
  ]);
  mocks.listOrders.mockResolvedValue([]);
  mocks.listPending.mockResolvedValue([]);
  mocks.billingMe.mockResolvedValue({ candidatePlan: "pro", plan: "free" });
});

describe("my cards overview (stage 4a, D510)", () => {
  it("is a read for signed-in people only", () => {
    expect(toolsFor(null).map((t) => t.name)).not.toContain("get_my_cards");
    expect(toolsFor("u1").map((t) => t.name)).toContain("get_my_cards");
    expect(findTool("get_my_cards")!.confirm(ctx)).toBe(false);
  });

  it("gives counts, statuses and at most five latest per group", async () => {
    const outcome = await runTool(ctx, "get_my_cards", {});
    const json = JSON.parse(
      outcome.llm.slice(
        outcome.llm.indexOf("{"),
        outcome.llm.lastIndexOf("}") + 1,
      ),
    );
    expect(json.vacancies.count).toBe(7);
    expect(json.vacancies.byStatus).toEqual({ published: 5, paused: 2 });
    expect(json.vacancies.latest).toHaveLength(5);
    expect(json.vacancies.latest[0]).toEqual({
      title: "Job 0",
      status: "published",
      link: "/jobs/j0",
    });
    expect(json.applications.count).toBe(1);
    expect(json.freelanceServices.byStatus).toEqual({ paused: 1 });
    expect(json.plan).toEqual({ candidatePlan: "pro", employerPlan: "free" });
    expect(json.account).toBe("/account");
  });

  it("reports a group that could not be read and keeps the others", async () => {
    const outcome = await runTool(ctx, "get_my_cards", {});
    expect(outcome.llm).toContain('"ugcBriefs":{"error":"not read now"}');
    expect(outcome.llm).toContain('"savedSearches":{"count":1');
  });

  it("links to account settings and the account page, for signed-in people", () => {
    expect(offerPath("account_settings", true)).toBe("/settings/account");
    expect(offerPath("my_account", true)).toBe("/account");
    expect(offerPath("account_settings", false)).toBeNull();
  });

  it("tells Spoki about the overview, the email language and the settings link", () => {
    const prompt = systemPrompt({ locale: "en", signedIn: true });
    expect(prompt).toContain("call get_my_cards");
    expect(prompt).toContain("change the email language");
    expect(prompt).toContain("show offer_step account_settings");
  });
});
