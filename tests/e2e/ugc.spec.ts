import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Browser, Page } from "@playwright/test";
import { expect, expectSignedInMenu, newContextWithIp, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

/**
 * Creative tests phases B and C (D458, D459) through the real API and pages.
 * A winner records an owed reward at the hire price. The creator reports a
 * live post and a view count. Only an admin marks the reward paid, and the
 * mark sends nothing.
 */

const password = "orbit-lantern-42";
const sameOrigin = { origin: "http://127.0.0.1:3000" };

function uniqueEmail(prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${suffix}@example.com`;
}

async function signUp(page: Page, prefix: string) {
  const email = uniqueEmail(prefix);
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/:\d+\/auth\/check-email$/);
  const mail = await waitForMail(page.request, email, 0);
  await page.goto(authLink(mail));
  await expect(page).toHaveURL(/:\d+\/auth\/(confirmed|signed-in)/);
  await expectSignedInMenu(page);
  const me = await page.request.get("/api/me");
  expect(me.status()).toBe(200);
  return ((await me.json()) as { id: string }).id;
}

async function newUser(browser: Browser, prefix: string) {
  const context = await newContextWithIp(browser);
  const page = await context.newPage();
  const id = await signUp(page, prefix);
  return { page, id };
}

async function withDb<T>(run: (client: pg.Client) => Promise<T>) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function insertCompany(ownerId: string) {
  const companyId = randomUUID();
  await withDb(async (client) => {
    await client.query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, $2, $3, 'verified', $4)`,
      [companyId, "UGC E2E Co", `ugc-e2e-${companyId.slice(0, 8)}`, ownerId],
    );
    await client.query(
      `insert into public.company_members (company_id, user_id, role)
       values ($1, $2, 'owner')`,
      [companyId, ownerId],
    );
  });
  return companyId;
}

async function makeAdmin(userId: string) {
  await withDb((client) =>
    client.query(
      `update public.users set platform_role = 'admin' where id = $1`,
      [userId],
    ),
  );
}

async function payoutFor(inviteId: string) {
  return withDb(async (client) => {
    const { rows } = await client.query<{
      id: string;
      amount_minor: string;
      status: string;
    }>(
      `select id, amount_minor::text, status from public.ugc_payouts
       where invite_id = $1`,
      [inviteId],
    );
    return rows;
  });
}

function ugc(page: Page, data: Record<string, unknown>) {
  return page.request.post("/api/ugc", { headers: sameOrigin, data });
}

function inTwoWeeks() {
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

test("a winner records an owed reward, reported views show, and only an admin marks it paid", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const companyUserId = await signUp(page, "ugc-company");
  const companyId = await insertCompany(companyUserId);
  const creator = await newUser(browser, "ugc-creator");
  const admin = await newUser(browser, "ugc-admin");
  await makeAdmin(admin.id);

  const profile = await ugc(creator.page, {
    action: "profile",
    displayName: "Ada",
    languages: ["en"],
    platforms: ["tiktok"],
    niches: ["app"],
    country: null,
    exampleUrls: [],
    inviteOptIn: true,
    status: "active",
  });
  expect(profile.status()).toBe(200);

  const created = await ugc(page, {
    action: "create",
    companyId,
    productName: "North",
    productSummary: "A small app",
    goal: "awareness",
    niches: ["app"],
    audience: "People who try new apps",
    country: null,
    languages: ["en"],
    mustSay: "Say the name",
    mustNot: "Do not promise income",
    platforms: ["tiktok"],
    videosWanted: 2,
    bountyMinor: "1500",
    deadline: inTwoWeeks(),
    rights: "ads",
    pitch: "We would like a short video",
    exampleUrls: [],
  });
  expect(created.status()).toBe(200);
  const campaignId = ((await created.json()) as { id: string }).id;

  const opened = await ugc(admin.page, {
    action: "moderate",
    campaignId,
    to: "open",
  });
  expect(opened.status()).toBe(200);

  const offer = await ugc(page, {
    action: "offer",
    campaignId,
    creatorId: creator.id,
  });
  expect(offer.status()).toBe(200);
  const inviteId = ((await offer.json()) as { inviteId: string }).inviteId;

  expect(
    (await ugc(creator.page, { action: "accept", inviteId })).status(),
  ).toBe(200);
  expect(
    (
      await ugc(creator.page, {
        action: "submit",
        inviteId,
        url: "https://www.tiktok.com/v/e2e-1",
        hook: "",
      })
    ).status(),
  ).toBe(200);

  // Views come only after a decision (D458).
  const early = await ugc(creator.page, {
    action: "report",
    inviteId,
    liveUrl: "https://www.tiktok.com/v/e2e-live",
    views: 900,
  });
  expect(early.status()).toBe(409);

  const decided = await ugc(page, { action: "decide", inviteId, to: "winner" });
  expect(decided.status()).toBe(200);
  expect(await decided.json()).toEqual({ status: "winner", charged: false });

  const owed = await payoutFor(inviteId);
  expect(owed).toHaveLength(1);
  expect(owed[0]).toMatchObject({ amount_minor: "1500", status: "owed" });
  const payoutId = owed[0]?.id ?? "";

  // The company does not set the count; a host outside the list is refused.
  expect(
    (
      await ugc(page, {
        action: "report",
        inviteId,
        liveUrl: "https://www.tiktok.com/v/e2e-live",
        views: 900,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await ugc(creator.page, {
        action: "report",
        inviteId,
        liveUrl: "https://example.com/v/1",
        views: 900,
      })
    ).status(),
  ).toBe(422);
  const reported = await ugc(creator.page, {
    action: "report",
    inviteId,
    liveUrl: "https://www.tiktok.com/v/e2e-live",
    views: 900,
  });
  expect(reported.status()).toBe(200);
  expect(await reported.json()).toEqual({
    reportedViews: 900,
    viewsSource: "reported",
    charged: false,
  });

  await page.goto(`/en/campaigns/${campaignId}/winners`);
  await expect(page.getByText("Reported views: 900")).toBeVisible();
  await expect(
    page.getByText("Nothing was charged and nothing was sent."),
  ).toBeVisible();
  const outsider = await creator.page.goto(
    `/en/campaigns/${campaignId}/winners`,
  );
  expect(outsider?.status()).toBe(404);

  // Only an admin marks it; the mark is final and sends nothing (D459).
  expect((await ugc(page, { action: "markPaid", payoutId })).status()).toBe(
    404,
  );
  expect(
    (await ugc(creator.page, { action: "markPaid", payoutId })).status(),
  ).toBe(404);
  const marked = await ugc(admin.page, { action: "markPaid", payoutId });
  expect(marked.status()).toBe(200);
  expect(await marked.json()).toEqual({
    status: "paid",
    charged: false,
    sent: false,
  });
  expect(
    (await ugc(admin.page, { action: "markPaid", payoutId })).status(),
  ).toBe(409);
  expect((await payoutFor(inviteId))[0]).toMatchObject({ status: "paid" });

  await creator.page.goto(`/en/campaigns/${campaignId}`);
  await expect(
    creator.page.getByText(
      "An admin marked this paid. The platform did not send the money.",
    ),
  ).toBeVisible();
});
