import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { FakeLLMProvider, fakeText, fakeToolCall } from "@/lib/llm";
import {
  saveCandidateProfile,
  updateCandidateInput,
} from "@/modules/candidates/service";
import { seedSkills } from "@/modules/taxonomy/service";
import {
  confirmAction,
  handleMessage,
  resolveConversation,
  setBotLLMForTests,
  type BotEvent,
} from "./service";
import { hashArgs, runTool, toolPreview } from "./service/tools";

/** Spoki account actions (D472) against a real database. */
const userId = randomUUID();
const otherId = randomUUID();
const companyId = randomUUID();
const jobId = randomUUID();
const applicationId = randomUUID();
const otherApplicationId = randomUUID();
const token = userId.slice(0, 8);
const companySlug = `acct-${token}`;
const prices = {
  "fake-model": {
    inputMicroUsdPerMTok: BigInt(3_000_000),
    outputMicroUsdPerMTok: BigInt(15_000_000),
  },
};

const rowsOf = async <T>(query: ReturnType<typeof sql>) =>
  (await getDb().execute(query)) as unknown as T[];

/** Runs a write the way an accepted card does. */
function confirmed(user: string, name: string, args: unknown) {
  return runTool(
    { userId: user, conversationId: randomUUID(), locale: "en", state: {} },
    name,
    args,
    { tool: name, userId: user, argsHash: hashArgs(name, args) },
  );
}

const ctxOf = (user: string) => ({
  userId: user,
  conversationId: randomUUID(),
  locale: "en",
  state: {},
});

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("Account tool tests require a loopback database");
  }
  const db = getDb();
  for (const id of [userId, otherId]) {
    await db.execute(sql`
      insert into public.users (id, auth_uid, terms_accepted_at, terms_version)
      values (${id}, ${randomUUID()}, now(), 'test')
    `);
  }
  await seedSkills();
  for (const id of [userId, otherId]) {
    await saveCandidateProfile(
      id,
      updateCandidateInput.parse({
        fullName: "Account Candidate",
        headline: "Engineer",
        desiredTitles: ["Backend engineer"],
        timezone: "Europe/Berlin",
        workHoursStart: "09:00",
        workHoursEnd: "18:00",
        workDays: [1, 2, 3, 4, 5],
        workFormats: ["remote"],
        employmentTypes: ["full_time"],
        skills: [{ raw: "TypeScript", level: "advanced" }],
        experience: [],
        languages: [{ lang: "en", level: "C1" }],
      }),
    );
  }
  await db.execute(sql`
    insert into public.companies (id, name, slug, status)
    values (${companyId}, ${`Acct Co ${token}`}, ${companySlug}, 'verified')
  `);
  await db.execute(sql`
    insert into public.jobs (id, company_id, title, description, category, work_format, employment_type, application_method, status, published_at, expires_at)
    values (${jobId}, ${companyId}, ${`Account role ${token}`}, 'Account integration role description long enough for the schema constraints.', 'engineering', 'remote', 'full_time', 'internal', 'published', now(), now() + interval '30 days')
  `);
  await db.execute(sql`
    insert into public.applications (id, job_id, candidate_id, status)
    values (${applicationId}, ${jobId}, ${userId}, 'applied'),
           (${otherApplicationId}, ${jobId}, ${otherId}, 'applied')
  `);
  await db.execute(
    sql`insert into public.saved_jobs (user_id, job_id) values (${userId}, ${jobId})`,
  );
});

afterEach(() => setBotLLMForTests(undefined));

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.bot_conversations where user_id in (${userId}, ${otherId})`,
  );
  await db.execute(
    sql`delete from public.notifications where user_id in (${userId}, ${otherId})`,
  );
  await db.execute(
    sql`delete from public.audit_logs where actor_id in (${userId}, ${otherId})`,
  );
  await db.execute(sql`delete from public.companies where id = ${companyId}`);
  await db.execute(
    sql`delete from public.users where id in (${userId}, ${otherId})`,
  );
});

describe("Spoki account actions (D472)", () => {
  it("names only the person's own targets on a card", async () => {
    expect(
      await toolPreview(ctxOf(userId), "withdraw_application", {
        applicationId,
      }),
    ).toBe(`Account role ${token}`);
    await expect(
      toolPreview(ctxOf(userId), "withdraw_application", {
        applicationId: otherApplicationId,
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      toolPreview(ctxOf(otherId), "unsave_job", { jobId }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("does not let a confirmed card change another person's application", async () => {
    await expect(
      confirmed(userId, "withdraw_application", {
        applicationId: otherApplicationId,
      }),
    ).rejects.toMatchObject({ status: 404 });
    const [row] = await rowsOf<{ status: string }>(
      sql`select status from public.applications where id = ${otherApplicationId}`,
    );
    expect(row?.status).toBe("applied");
  });

  it("withdraws, unsaves, saves and drops a search, and follows", async () => {
    await confirmed(userId, "withdraw_application", { applicationId });
    const [app] = await rowsOf<{ status: string }>(
      sql`select status from public.applications where id = ${applicationId}`,
    );
    expect(app?.status).toBe("withdrawn");

    await confirmed(userId, "unsave_job", { jobId });
    expect(
      await rowsOf(
        sql`select 1 from public.saved_jobs where user_id = ${userId}`,
      ),
    ).toHaveLength(0);

    await confirmed(userId, "save_search", {
      name: "Remote backend",
      q: "backend",
      workFormat: "remote",
    });
    const [search] = await rowsOf<{ id: string; alert: boolean }>(
      sql`select id, alert from public.saved_searches where user_id = ${userId}`,
    );
    expect(search).toBeDefined();
    await expect(
      toolPreview(ctxOf(otherId), "delete_saved_search", {
        searchId: search!.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
    await confirmed(userId, "set_search_alert", {
      searchId: search!.id,
      alert: !search!.alert,
    });
    await confirmed(userId, "delete_saved_search", { searchId: search!.id });
    expect(
      await rowsOf(
        sql`select 1 from public.saved_searches where user_id = ${userId}`,
      ),
    ).toHaveLength(0);

    await confirmed(userId, "follow_company", { slug: companySlug });
    expect(
      await rowsOf(
        sql`select 1 from public.company_follows where user_id = ${userId} and company_id = ${companyId}`,
      ),
    ).toHaveLength(1);
    await confirmed(userId, "unfollow_company", { slug: companySlug });
    expect(
      await rowsOf(
        sql`select 1 from public.company_follows where user_id = ${userId}`,
      ),
    ).toHaveLength(0);
  });

  it("changes settings: profile visibility, briefs, one notification", async () => {
    await confirmed(userId, "set_profile_hidden", { hidden: true });
    await confirmed(userId, "set_morning_briefs", { enabled: true });
    await confirmed(userId, "set_notification", {
      type: "search.alert",
      channel: "email",
      enabled: false,
    });
    const settings = await runTool(ctxOf(userId), "get_my_settings", {});
    const parsed = JSON.parse(settings.llm) as {
      profileHidden: boolean;
      morningBriefs: boolean;
      notificationsOff: string[];
    };
    expect(parsed.profileHidden).toBe(true);
    expect(parsed.morningBriefs).toBe(true);
    expect(parsed.notificationsOff).toContain("search.alert/email");
    const [other] = await rowsOf<{ is_hidden: boolean }>(
      sql`select is_hidden from public.candidate_profiles where user_id = ${otherId}`,
    );
    expect(other?.is_hidden).toBe(false);
  });

  it("shows a named card in the chat and runs it only after accept", async () => {
    setBotLLMForTests({
      provider: new FakeLLMProvider([
        fakeToolCall("set_profile_hidden", { hidden: false }),
        fakeText("The card is on the screen."),
      ]),
      model: "fake-model",
      prices,
    });
    const { conversation } = await resolveConversation({
      userId,
      token: undefined,
      locale: "en",
    });
    const events: BotEvent[] = [];
    await handleMessage(
      {
        userId,
        conversation,
        text: "show my profile to employers again",
        ip: "198.51.100.72",
        locale: "en",
      },
      (event) => events.push(event),
    );
    const card = events.find((event) => event.type === "confirm_request");
    expect(card).toMatchObject({ tool: "set_profile_hidden", preview: "" });
    const [before] = await rowsOf<{ is_hidden: boolean }>(
      sql`select is_hidden from public.candidate_profiles where user_id = ${userId}`,
    );
    expect(before?.is_hidden).toBe(true);
    await expect(
      confirmAction({
        userId,
        conversation,
        confirmationId: (card as { confirmationId: string }).confirmationId,
        accept: true,
      }),
    ).resolves.toMatchObject({ accepted: true });
    const [after] = await rowsOf<{ is_hidden: boolean }>(
      sql`select is_hidden from public.candidate_profiles where user_id = ${userId}`,
    );
    expect(after?.is_hidden).toBe(false);
  });
});
