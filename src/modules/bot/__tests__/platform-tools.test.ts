import { beforeEach, describe, expect, it, vi } from "vitest";

const JOB = "00000000-0000-4000-8000-0000000000b1";
const APP = "00000000-0000-4000-8000-0000000000c1";

const state = vi.hoisted(() => ({
  patched: [] as [string, string, string][],
  status: "applied",
}));

vi.mock("@/modules/applications/service", async () => {
  const transitions = await vi.importActual<
    typeof import("@/modules/applications/service/transitions")
  >("@/modules/applications/service/transitions");
  return {
    APPLICATION_STATUSES: transitions.APPLICATION_STATUSES,
    employerPatchTargets: transitions.employerPatchTargets,
    listEmployerApplications: async () => ({
      items: [
        {
          id: APP,
          jobId: JOB,
          jobTitle: "Frontend Engineer",
          status: state.status,
          coverNote: "I build design systems.",
          candidateId: "cand",
          candidateName: "Ada",
          reapplyCount: 0,
          createdAt: "2026-11-01T10:00:00.000Z",
        },
      ],
      nextCursor: null,
    }),
    patchApplicationStatus: async (
      userId: string,
      applicationId: string,
      to: string,
    ) => {
      state.patched.push([userId, applicationId, to]);
      return { status: to };
    },
  };
});

vi.mock("@/modules/salaries/service", () => ({
  getSalaryOverview: async () => [
    {
      skill: { slug: "react", nameEn: "React", nameRu: "React" },
      stats: {
        skillSlug: "react",
        jobCount: 12,
        p25: 60000,
        median: 80000,
        p75: 100000,
        bySeniority: [],
      },
    },
    {
      skill: { slug: "python", nameEn: "Python", nameRu: "Python" },
      stats: {
        skillSlug: "python",
        jobCount: 30,
        p25: 70000,
        median: 90000,
        p75: 110000,
        bySeniority: [],
      },
    },
  ],
}));

const { platformTools } = await import("../service/platform-tools");
const find = (name: string) =>
  platformTools.find((tool) => tool.name === name)!;
const ctx = { userId: "u1", conversationId: "c1", locale: "en", state: {} };

beforeEach(() => {
  state.patched = [];
  state.status = "applied";
});

describe("services reached through Spoki (TZ 53)", () => {
  it("reads salaries for the asked skill only", async () => {
    const result = await find("get_salaries").run(ctx, { skills: ["react"] });
    const rows = JSON.parse(result.llm) as { skill: string; jobs: number }[];
    expect(rows).toEqual([
      expect.objectContaining({ skill: "React", jobs: 12 }),
    ]);
  });

  it("puts a candidate move on a card and makes it only when run", async () => {
    const tool = find("set_application_status");
    expect(tool.confirm(ctx)).toBe(true);
    state.status = "shortlisted";
    const input = { jobId: JOB, applicationId: APP, status: "interview" };
    expect(await tool.preview!(ctx, input)).toBe("Ada · Frontend Engineer");
    expect(state.patched).toEqual([]);
    await tool.run(ctx, input);
    expect(state.patched).toEqual([["u1", APP, "interview"]]);
  });

  it("gives no card for a move the status machine refuses", async () => {
    state.status = "hired";
    await expect(
      find("set_application_status").preview!(ctx, {
        jobId: JOB,
        applicationId: APP,
        status: "interview",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("lists applicants with the moves they allow", async () => {
    const result = await find("get_job_applicants").run(ctx, { jobId: JOB });
    expect(result.llm).toContain("Ada");
    expect(result.llm).toContain("canMoveTo");
  });

  it("keeps the employer's tools from guests", () => {
    for (const name of [
      "get_job_applicants",
      "set_application_status",
      "get_my_notifications",
    ])
      expect(find(name).access).toBe("user");
  });
});
