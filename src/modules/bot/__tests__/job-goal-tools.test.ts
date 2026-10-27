import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJobGoal, transitionJobGoal } from "../service/job-goal";
import { runTool, type ToolContext } from "../service/tools";

const searchJobsMock = vi.hoisted(() => vi.fn());
const getOwnCandidateMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/jobs/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/jobs/service")>()),
  searchJobs: (...args: unknown[]) => searchJobsMock(...args),
}));
vi.mock("@/modules/candidates/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/candidates/service")>()),
  getOwnCandidate: (...args: unknown[]) => getOwnCandidateMock(...args),
}));

const NOW = new Date("2026-10-27T12:00:00.000Z");
const USER: ToolContext = {
  userId: "synthetic-user",
  conversationId: "synthetic-thread",
  locale: "ru",
  state: {},
};
const GUEST: ToolContext = { ...USER, userId: null };

const jobs = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Дизайнер продукта",
    company: { name: "Northstar Demo" },
    category: "design",
    workFormat: "remote",
    salaryMin: { amountMinor: "8000000", currency: "USD" },
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "UX-дизайнер",
    company: { name: "Orbit Sample" },
    category: "design",
    workFormat: "remote",
    salaryMin: { amountMinor: "7200000", currency: "USD" },
  },
];

beforeEach(() => {
  searchJobsMock.mockReset();
  getOwnCandidateMock.mockReset();
});

describe("synthetic profile and published job tool results", () => {
  it("uses the real read-tool adapters, then moves the goal to the next user choice", async () => {
    getOwnCandidateMock.mockResolvedValue({
      fullName: "Марина Примерова",
      email: "marina@example.invalid",
      country: "PL",
      workFormats: ["remote"],
      preferences: { categories: ["design"] },
      skills: [],
    });
    searchJobsMock.mockResolvedValue({ items: jobs });

    let goal = createJobGoal(
      { categorySlug: "design", countryCode: "PL", remoteOnly: true },
      NOW,
    );
    const profile = await runTool(
      { ...USER, state: { jobGoal: goal } },
      "get_my_profile",
      {},
    );
    expect(profile.llm).toContain('"country":"PL"');
    expect(profile.llm).not.toContain("marina@example.invalid");
    if (!profile.state?.jobGoal)
      throw new Error("Profile did not advance goal");
    goal = profile.state.jobGoal;
    expect(goal).toMatchObject({ step: "search", status: "active" });

    const search = await runTool(
      { ...GUEST, state: { jobGoal: goal } },
      "search_jobs",
      {},
    );
    expect(searchJobsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "design",
        country: "PL",
        workFormat: ["remote"],
      }),
      "ru",
      { hidden: null },
    );
    expect(search.client).toMatchObject({
      kind: "jobs",
      data: [
        {
          id: jobs[0]!.id,
          title: jobs[0]!.title,
          companyName: jobs[0]!.company.name,
          workFormat: "remote",
        },
        {
          id: jobs[1]!.id,
          title: jobs[1]!.title,
          companyName: jobs[1]!.company.name,
          workFormat: "remote",
        },
      ],
    });
    expect(search.llm).toContain("Northstar Demo");
    expect(search.llm).toContain("8000000");
    if (!search.state?.jobGoal) throw new Error("Search did not advance goal");
    goal = search.state.jobGoal;
    expect(goal).toMatchObject({ status: "waiting_user", step: "next" });
    expect(JSON.stringify(goal)).not.toContain("8000000");
  });

  it("reports an empty platform search without advancing to a fabricated match", async () => {
    searchJobsMock.mockResolvedValue({ items: [] });
    let goal = createJobGoal({ categorySlug: "research" }, NOW);
    goal = transitionJobGoal(goal, { type: "profile_skipped" }, NOW)!;
    const search = await runTool(
      { ...GUEST, state: { jobGoal: goal } },
      "search_jobs",
      {},
    );
    expect(search).toMatchObject({
      llm: "No jobs found.",
      client: { kind: "jobs", data: [] },
    });
    if (!search.state?.jobGoal) throw new Error("Empty search lost goal");
    goal = search.state.jobGoal;
    expect(goal).toMatchObject({ status: "waiting_user", step: "search" });
  });

  it("accepts an explicit country while retaining the old draft fallback", async () => {
    searchJobsMock.mockResolvedValue({ items: [] });
    await runTool(
      { ...GUEST, state: { draft: { country: "DE" } } },
      "search_jobs",
      { country: "PL" },
    );
    expect(searchJobsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ country: "PL" }),
      "ru",
      { hidden: null },
    );
    await runTool(
      { ...GUEST, state: { draft: { country: "DE" } } },
      "search_jobs",
      {},
    );
    expect(searchJobsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ country: "DE" }),
      "ru",
      { hidden: null },
    );
  });
});
