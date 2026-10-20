import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "@/lib/http";

const jobs = vi.hoisted(() => ({
  findOwnedJob: vi.fn(),
  findMemberRole: vi.fn(),
  listJobsForUser: vi.fn(),
  transitionOwnedJob: vi.fn(),
  updateJob: vi.fn(),
}));

vi.mock("@/modules/jobs/service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...jobs,
}));
vi.mock("@/modules/applications/service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  countByStatusForJob: vi.fn(async () => ({ submitted: 2, viewed: 1 })),
}));
vi.mock("@/modules/auth/service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requireActiveUserById: vi.fn(async (id: string) => ({ id })),
}));

const { ACCOUNT_CARD_TOOLS } = await import("@/components/bot/account-card");
const { default: en } = await import("@/messages/en.json");
const { systemPrompt } = await import("../prompts/system");
const { employerJobTools, namedJobPatch } =
  await import("../service/employer-job-tools");
const { hashArgs, runTool, toolPreview, toolsFor } =
  await import("../service/tools");

const JOB = "00000000-0000-4000-8000-000000000042";
const ctx = { userId: "u1", conversationId: "c1", locale: "en", state: {} };
const ownJob = {
  id: JOB,
  title: "Senior Python developer",
  companyId: "co1",
  status: "published",
  description: "Build the API.",
  workFormat: "remote",
  location: "Berlin",
  company: { name: "Acme" },
};

function confirmed(tool: string, args: unknown) {
  return { tool, userId: ctx.userId, argsHash: hashArgs(tool, args) };
}

beforeEach(() => {
  vi.clearAllMocks();
  jobs.findOwnedJob.mockResolvedValue(ownJob);
  jobs.findMemberRole.mockResolvedValue("owner");
  jobs.transitionOwnedJob.mockResolvedValue({ id: JOB, status: "paused" });
  jobs.updateJob.mockResolvedValue({ id: JOB, status: "published" });
});

describe("employer job tools (D498)", () => {
  it("are for signed-in people in the general thread only", () => {
    const names = employerJobTools.map((tool) => tool.name);
    const guest = toolsFor(null).map((tool) => tool.name);
    const general = toolsFor("u1").map((tool) => tool.name);
    const ugc = toolsFor("u1", { ugcDraftMode: true }).map((t) => t.name);
    const draft = toolsFor("u1", { jobDraftMode: true }).map((t) => t.name);
    for (const name of names) {
      expect(guest).not.toContain(name);
      expect(general).toContain(name);
      expect(ugc).not.toContain(name);
      expect(draft).not.toContain(name);
    }
  });

  it("confirm every change on a card that names the vacancy", () => {
    const writes = employerJobTools.filter((tool) => tool.confirm(ctx));
    expect(writes.map((tool) => tool.name).sort()).toEqual([
      "propose_job_update",
      "set_job_status",
    ]);
    const copy = en.chat.account as Record<string, unknown>;
    for (const tool of writes) {
      expect(tool.preview).toBeTypeOf("function");
      expect(ACCOUNT_CARD_TOOLS).toContain(tool.name);
      expect(copy[tool.name]).toBeTruthy();
    }
  });

  it("refuses a change without the matching card", async () => {
    const args = { jobId: JOB, action: "close" };
    await expect(runTool(ctx, "set_job_status", args)).rejects.toMatchObject({
      status: 422,
    });
    await expect(
      runTool(
        ctx,
        "set_job_status",
        args,
        confirmed("set_job_status", { ...args, action: "pause" }),
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(jobs.transitionOwnedJob).not.toHaveBeenCalled();
  });

  it("closes on delete and resumes through extend, as the cabinet does", async () => {
    for (const [action, expected] of [
      ["close", "close"],
      ["resume", "extend"],
      ["pause", "pause"],
      ["publish", "publish"],
    ] as const) {
      const args = { jobId: JOB, action };
      await runTool(
        ctx,
        "set_job_status",
        args,
        confirmed("set_job_status", args),
      );
      expect(jobs.transitionOwnedJob).toHaveBeenLastCalledWith(
        JOB,
        expected,
        "u1",
      );
    }
  });

  it("shows no card for someone else's vacancy or a viewer role", async () => {
    jobs.findOwnedJob.mockRejectedValueOnce(notFound());
    await expect(
      toolPreview(ctx, "set_job_status", { jobId: JOB, action: "close" }),
    ).rejects.toMatchObject({ status: 404 });
    jobs.findMemberRole.mockResolvedValueOnce("viewer");
    await expect(
      toolPreview(ctx, "set_job_status", { jobId: JOB, action: "close" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      toolPreview(ctx, "set_job_status", { jobId: JOB, action: "close" }),
    ).resolves.toBe("Senior Python developer");
  });

  it("changes only the fields the person named", async () => {
    const patch = namedJobPatch({
      salaryMin: "400000",
      salaryMax: "600000",
      salaryCurrency: "USD",
      salaryPeriod: "month",
      salaryBasis: "gross",
    });
    expect(Object.keys(patch).sort()).toEqual([
      "salaryBasis",
      "salaryCurrency",
      "salaryMax",
      "salaryMin",
      "salaryPeriod",
    ]);
    expect(() => namedJobPatch({ title: "ab" })).toThrow(
      expect.objectContaining({ status: 422 }),
    );
    expect(() => namedJobPatch({ workFormat: "hybrid" })).toThrow(/location/);
    expect(
      namedJobPatch(
        { salaryMin: "500000" },
        {
          salaryCurrency: "USD",
          salaryPeriod: "month",
          salaryBasis: "gross",
          location: "Berlin",
        },
      ),
    ).toEqual({ salaryMin: "500000" });

    const args = { jobId: JOB, workFormat: "hybrid" as const };
    await runTool(
      ctx,
      "propose_job_update",
      args,
      confirmed("propose_job_update", args),
    );
    expect(jobs.updateJob).toHaveBeenCalledWith(
      JOB,
      { workFormat: "hybrid" },
      { id: "u1" },
      null,
    );
  });

  it("asks what to change before showing an empty edit card", async () => {
    await expect(
      toolPreview(ctx, "propose_job_update", { jobId: JOB }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("does not edit a closed vacancy", async () => {
    jobs.findOwnedJob.mockResolvedValue({ ...ownJob, status: "closed" });
    const args = { jobId: JOB, title: "Lead Python developer" };
    await expect(
      runTool(
        ctx,
        "propose_job_update",
        args,
        confirmed("propose_job_update", args),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(jobs.updateJob).not.toHaveBeenCalled();
  });

  it("lists own vacancies with the count of applications", async () => {
    jobs.listJobsForUser.mockResolvedValue([
      {
        job: { ...ownJob, publishedAt: null, expiresAt: null },
        company: { name: "Acme" },
      },
    ]);
    const outcome = await runTool(ctx, "get_my_jobs", {});
    expect(outcome.llm).toContain("Senior Python developer");
    expect(outcome.llm).toContain('"applications":3');
    expect(outcome.llm).toContain(`/jobs/${JOB}`);
  });

  it("tells Spoki that delete means close and the card does the change", () => {
    const prompt = systemPrompt({ locale: "en", signedIn: true });
    expect(prompt).toContain("call get_my_jobs");
    expect(prompt).toContain("delete means close");
  });
});
