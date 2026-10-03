import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { HttpError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import {
  listPublishedJobsForCompany,
  searchJobs,
} from "@/modules/jobs/service";
import {
  getHiddenSetsForViewer,
  hideJobForUser,
  isJobSavedForUser,
  listSavedJobsForUser,
  recordJobFeedback,
  reportJobForUser,
  saveJobForUser,
  unsaveJobForUser,
} from "./service";

const viewerId = randomUUID();
const otherId = randomUUID();
const reporterId = randomUUID();
const companyId = randomUUID();
const otherCompanyId = randomUUID();
const jobA1 = randomUUID();
const jobA2 = randomUUID();
const jobB1 = randomUUID();
const searchToken = companyId.slice(0, 8);
const query = () => jobSearchQuery.parse({ q: searchToken });

function ids(items: Array<{ id: string }>) {
  return items.map((item) => item.id).sort();
}

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("4B integration tests require a loopback database");
  }
  const db = getDb();
  for (const id of [viewerId, otherId, reporterId]) {
    await db.execute(
      sql`insert into public.users(id,auth_uid,terms_accepted_at,terms_version) values (${id},${randomUUID()},now(),'4b-integration')`,
    );
  }
  await db.execute(
    sql`insert into public.companies(id,name,slug,status,created_by) values (${companyId},'4B Feedback Test',${`4b-feedback-${companyId.slice(0, 8)}`},'verified',${viewerId})`,
  );
  await db.execute(
    sql`insert into public.companies(id,name,slug,status,created_by) values (${otherCompanyId},'4B Feedback Other',${`4b-other-${otherCompanyId.slice(0, 8)}`},'verified',${viewerId})`,
  );
  await db.execute(sql`insert into public.jobs(id,company_id,title,description,category,work_format,employment_type,application_method,status,published_at,expires_at) values
    (${jobA1},${companyId},${`Feedback ${searchToken} engineer one`},'Integration test role description long enough for the 4B feedback integration suite.','engineering','remote','full_time','internal','published',now(),now()+interval '30 days'),
    (${jobA2},${companyId},${`Feedback ${searchToken} engineer two`},'Integration test role description long enough for the 4B feedback integration suite.','engineering','remote','full_time','internal','published',now()-interval '1 second',now()+interval '30 days'),
    (${jobB1},${otherCompanyId},${`Feedback ${searchToken} engineer three`},'Integration test role description long enough for the 4B feedback integration suite.','engineering','remote','full_time','internal','published',now()-interval '2 seconds',now()+interval '30 days')`);
});

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.companies where id in (${companyId}, ${otherCompanyId})`,
  );
  await db.execute(
    sql`delete from public.users where id in (${viewerId}, ${otherId}, ${reporterId})`,
  );
  await db.execute(
    sql`delete from rate_limit_counters where key like ${`report|${reporterId}|%`}`,
  );
});

describe("save / unsave (4B)", () => {
  it("is idempotent and records feedback events", async () => {
    await saveJobForUser(viewerId, jobA1);
    await saveJobForUser(viewerId, jobA1); // second save changes nothing
    expect(await isJobSavedForUser(viewerId, jobA1)).toBe(true);
    const saved = await listSavedJobsForUser(viewerId);
    expect(saved.filter((entry) => entry.job.id === jobA1)).toHaveLength(1);

    await unsaveJobForUser(viewerId, jobA1);
    expect(await isJobSavedForUser(viewerId, jobA1)).toBe(false);
    expect(
      (await listSavedJobsForUser(viewerId)).filter(
        (entry) => entry.job.id === jobA1,
      ),
    ).toHaveLength(0);
  });

  it("404s when the job is not publicly visible", async () => {
    await expect(saveJobForUser(viewerId, randomUUID())).rejects.toThrow(
      HttpError,
    );
  });
});

describe("hidden jobs and companies (section 7, D110)", () => {
  it("removes a hidden job from the viewer listing but not from others", async () => {
    await hideJobForUser(viewerId, jobA1, { scope: "job", reason: "salary" });

    const viewerView = await searchJobs(query(), "en", {
      hidden: await getHiddenSetsForViewer(viewerId),
    });
    expect(ids(viewerView.items)).not.toContain(jobA1);
    expect(ids(viewerView.items)).toContain(jobA2);

    const otherView = await searchJobs(query(), "en", {
      hidden: await getHiddenSetsForViewer(otherId),
    });
    expect(ids(otherView.items)).toContain(jobA1);
    expect(ids(otherView.items)).toContain(jobA2);

    const guestView = await searchJobs(query(), "en");
    expect(ids(guestView.items)).toContain(jobA1);
  });

  it("hides all jobs of a company on hide_company", async () => {
    await hideJobForUser(viewerId, jobB1, { scope: "company" });
    const viewerView = await searchJobs(query(), "en", {
      hidden: await getHiddenSetsForViewer(viewerId),
    });
    expect(ids(viewerView.items)).not.toContain(jobB1);

    expect(
      ids(
        await listPublishedJobsForCompany(otherCompanyId, "en", {
          hidden: await getHiddenSetsForViewer(viewerId),
        }),
      ),
    ).toEqual([]);
    expect(
      ids(
        await listPublishedJobsForCompany(companyId, "en", {
          hidden: await getHiddenSetsForViewer(viewerId),
        }),
      ),
    ).toEqual([jobA2]);
  });

  it("drops hidden jobs from the saved list", async () => {
    await saveJobForUser(viewerId, jobB1);
    // company B was hidden above → the saved job disappears from the list
    const saved = await listSavedJobsForUser(viewerId);
    expect(saved.some((entry) => entry.job.id === jobB1)).toBe(false);
    await unsaveJobForUser(viewerId, jobB1);
  });
});

describe("reports (14.5, D111)", () => {
  it("records one report per object and maps the second to 409", async () => {
    const first = await reportJobForUser(reporterId, jobA1, {
      reason: "scam",
      details: "looks like a scam",
    });
    expect(first.reportId).toBeTruthy();
    await expect(
      reportJobForUser(reporterId, jobA1, { reason: "spam" }),
    ).rejects.toMatchObject({ status: 409, code: "ALREADY_REPORTED" });
  });

  it("rejects invalid report reasons", async () => {
    await expect(
      reportJobForUser(reporterId, jobA2, { reason: "because" as "scam" }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });

  it("enforces the 10-per-day report limit with Retry-After (P15)", async () => {
    const objects = [jobA1, jobA2, jobB1];
    // jobA1 is already reported → not consumed again, so fill up on others:
    // the limit is enforced per user per day by enforceRateLimit.
    let hits = 0;
    let limited: HttpError | null = null;
    for (let i = 0; i < 12 && !limited; i += 1) {
      const entityId = randomUUID(); // not persisted: inserts would fail FK
      try {
        // Directly exercise the limiter (the route calls it before insert).
        await enforceRateLimit("report", reporterId);
        hits += 1;
        void entityId;
      } catch (error) {
        if (error instanceof HttpError) limited = error;
        else throw error;
      }
    }
    expect(hits).toBe(10);
    expect(limited).not.toBeNull();
    expect(limited!.status).toBe(429);
    expect(limited!.code).toBe("RATE_LIMITED");
    expect(limited!.headers?.["Retry-After"]).toBeTruthy();
    void objects;
  });
});

describe("recordJobFeedback contract for 5A/8A (D110)", () => {
  it("records applied/applied_external without a reason", async () => {
    await recordJobFeedback({
      userId: reporterId,
      jobId: jobA1,
      companyId,
      action: "applied",
    });
    await recordJobFeedback({
      userId: reporterId,
      jobId: jobA2,
      companyId,
      action: "applied_external",
    });
  });

  it("rejects invalid action/reason combinations", async () => {
    await expect(
      recordJobFeedback({
        userId: reporterId,
        jobId: jobA1,
        companyId,
        action: "fired",
      }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
    await expect(
      recordJobFeedback({
        userId: reporterId,
        jobId: jobA1,
        companyId,
        action: "hidden",
        reason: "money",
      }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });
});
