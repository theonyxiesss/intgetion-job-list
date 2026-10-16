import { randomUUID } from "node:crypto";
import { inArray, or } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { FakeLLMProvider, fakeText, fakeToolCall } from "@/lib/llm";
import { getDb } from "@/db/client";
import { freelanceOrders, users } from "@/db/schema";
import {
  saveCandidateProfile,
  updateCandidateInput,
} from "@/modules/candidates/service";
import { decideServiceModeration } from "@/modules/freelance/service";
import { seedSkills } from "@/modules/taxonomy/service";
import {
  confirmAction,
  findConfirmationConversation,
  findTool,
  handleMessage,
  hashArgs,
  pendingConfirmations,
  readFreelanceFocus,
  resumeConversation,
  runTool,
  setBotLLMForTests,
  type BotEvent,
  type ToolContext,
} from "./service";

/**
 * The whole freelance path through Spoki's tools (28.8, D460): read tools
 * by themselves, every write with a confirmed card, links from the card.
 */

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const appUrl = process.env.DATABASE_URL;
if (!migrationUrl || !appUrl) {
  throw new Error(
    "Integration tests need DATABASE_MIGRATION_URL and DATABASE_URL.",
  );
}

const sellerId = randomUUID();
const buyerId = randomUUID();
const userIds = [sellerId, buyerId];
const token = sellerId.slice(0, 8);
let serviceId = "";
const prices = {
  "fake-model": {
    inputMicroUsdPerMTok: BigInt(3_000_000),
    outputMicroUsdPerMTok: BigInt(15_000_000),
  },
};

function ctx(userId: string | null): ToolContext {
  return { userId, conversationId: randomUUID(), locale: "en", state: {} };
}

/** Runs a write as if its card was confirmed by `userId`. */
async function confirmed(
  userId: string,
  name: string,
  args: unknown,
  card?: Record<string, unknown>,
) {
  const parsed = findTool(name)!.input.parse(args);
  return runTool(
    ctx(userId),
    name,
    args,
    { tool: name, argsHash: hashArgs(name, parsed), userId },
    card,
  );
}

afterAll(async () => {
  setBotLLMForTests(undefined);
  const db = getDb();
  await db
    .delete(freelanceOrders)
    .where(
      or(
        inArray(freelanceOrders.sellerId, userIds),
        inArray(freelanceOrders.buyerId, userIds),
      ),
    );
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("freelance path in Spoki (28.8)", () => {
  it("goes from a seller's words to a buyer's review", async () => {
    await seedSkills();
    for (const id of userIds) {
      await getDb().insert(users).values({
        id,
        authUid: randomUUID(),
        termsAcceptedAt: new Date(),
        termsVersion: "2026-10-03",
        locale: "en",
      });
    }
    await saveCandidateProfile(
      sellerId,
      updateCandidateInput.parse({
        fullName: "Grace Hopper",
        headline: "Frontend developer",
        desiredTitles: ["Frontend developer"],
        timezone: "Europe/Berlin",
        workHoursStart: "09:00",
        workHoursEnd: "18:00",
        workDays: [1, 2, 3, 4, 5],
        workFormats: ["remote"],
        employmentTypes: ["freelance"],
        experienceYears: 5,
        skills: [{ raw: "React", level: "advanced" }],
        experience: [],
        languages: [{ lang: "en", level: "C1" }],
      }),
    );

    // An empty direction says so instead of a price.
    const empty = await runTool(ctx(null), "freelance_price_range", {
      category: "people",
    });
    expect(empty.llm).toMatch(/No published prices/);

    // A write without the card does not run.
    await expect(
      runTool(ctx(sellerId), "propose_freelancer_mode", { accepting: true }),
    ).rejects.toMatchObject({ code: "CONFIRMATION_REQUIRED" });
    await confirmed(sellerId, "propose_freelancer_mode", { accepting: true });

    const title = `Landing page in a week ${token}`;
    const created = await confirmed(
      sellerId,
      "propose_service",
      {
        title,
        category: "development",
        description:
          "A fast landing page on Next.js with a sign-up form, basic analytics and a deploy to Vercel, made from your layout.",
        languages: ["en"],
        skills: ["React"],
        packages: [
          {
            tier: "basic",
            price: "450",
            deliveryDays: 7,
            revisions: 1,
            includes: ["Up to 5 blocks"],
          },
        ],
      },
      { links: "https://example.com/case-1\nhttps://example.com/case-2" },
    );
    expect(created.llm).toMatch(/pending/);
    serviceId = (created.client?.data as { id: string }).id;

    // Not in the catalog before a moderator decides (D447).
    const before = await runTool(ctx(null), "find_services", { q: token });
    expect(before.llm).toMatch(/No published services/);

    const mine = await runTool(ctx(sellerId), "get_my_services", {});
    expect(mine.llm).toContain("pending");
    await decideServiceModeration(serviceId, "publish", null);

    const found = await runTool(ctx(null), "find_services", { q: token });
    expect(found.llm).toContain('"price":"$450"');
    expect(found.llm).not.toContain("example.com");
    const read = await runTool(ctx(buyerId), "get_service", { serviceId });
    expect(read.llm).toContain("Up to 5 blocks");

    const sent = await confirmed(buyerId, "send_service_request", {
      serviceId,
      tier: "basic",
      task: "A landing page for my wallet launch, buyer@example.com",
    });
    expect(sent.llm).toMatch(/Price \$450/);
    const orderId = (sent.client?.data as { id: string }).id;

    const order = await runTool(ctx(sellerId), "get_order", { orderId });
    expect(order.llm).not.toContain("buyer@example.com");
    // A stranger's order reads as not found.
    await expect(
      runTool(ctx(randomUUID()), "get_order", { orderId }),
    ).rejects.toMatchObject({ status: 404 });

    await confirmed(sellerId, "respond_to_request", {
      orderId,
      answer: "accept",
    });
    await confirmed(sellerId, "start_order", { orderId });
    // The result link is required on the card.
    await expect(
      confirmed(sellerId, "mark_delivered", { orderId }, {}),
    ).rejects.toMatchObject({ status: 400 });
    await confirmed(
      sellerId,
      "mark_delivered",
      { orderId },
      { deliveryUrl: "https://example.com/result" },
    );
    const delivered = await runTool(ctx(buyerId), "get_order", { orderId });
    expect(delivered.llm).toContain('"status":"delivered"');
    expect(delivered.llm).not.toContain("example.com/result");

    await confirmed(buyerId, "review_delivery", {
      orderId,
      decision: "accept",
    });
    const review = await confirmed(buyerId, "propose_review", {
      orderId,
      rating: 5,
      body: "Fast and clean work.",
    });
    expect(review.llm).toMatch(/5 of 5/);

    const orders = await runTool(ctx(buyerId), "get_my_orders", {});
    expect(orders.llm).toContain('"status":"completed"');

    const range = await runTool(ctx(null), "freelance_price_range", {
      category: "development",
    });
    expect(range.llm).toMatch(/minimum \$\d/);
  });

  it("opens /chat?service=, shows the card again and takes the link from it", async () => {
    const focus = await readFreelanceFocus(null, { serviceId });
    expect(focus).toMatchObject({ kind: "service", id: serviceId });
    const opened = await resumeConversation({
      userId: buyerId,
      token: undefined,
      locale: "en",
      freelance: focus,
    });
    const conversation = opened.conversation!;
    expect(conversation.state).toMatchObject({
      topic: "freelance",
      freelanceServiceId: serviceId,
    });

    setBotLLMForTests({
      provider: new FakeLLMProvider([
        fakeToolCall("send_service_request", {
          serviceId,
          tier: "basic",
          task: "Second landing page for the wallet launch",
        }),
        fakeText("unused"),
      ]),
      model: "fake-model",
      prices,
    });
    const events: BotEvent[] = [];
    await handleMessage(
      {
        userId: buyerId,
        conversation,
        text: "order the basic one again",
        ip: "127.0.0.1",
        locale: "en",
      },
      (event) => events.push(event),
    );
    const card = events.find((event) => event.type === "confirm_request");
    expect(card).toMatchObject({ tool: "send_service_request", fields: [] });
    const confirmationId = (card as { confirmationId: string }).confirmationId;

    // A reload or a Telegram link shows the same open card.
    const pending = await pendingConfirmations(conversation.id, buyerId);
    expect(pending.map((row) => row.confirmationId)).toContain(confirmationId);
    const thread = await findConfirmationConversation(buyerId, confirmationId);
    expect(thread?.id).toBe(conversation.id);
    expect(
      await findConfirmationConversation(sellerId, confirmationId),
    ).toBeUndefined();

    const done = await confirmAction({
      userId: buyerId,
      conversation: thread!,
      confirmationId,
      accept: true,
    });
    const orderId = (done as { result: { data: { id: string } } }).result.data
      .id;
    expect(await pendingConfirmations(conversation.id, buyerId)).toHaveLength(
      0,
    );

    await confirmed(sellerId, "respond_to_request", {
      orderId,
      answer: "accept",
    });
    await confirmed(sellerId, "start_order", { orderId });

    const sellerThread = await resumeConversation({
      userId: sellerId,
      token: undefined,
      locale: "en",
      freelance: await readFreelanceFocus(sellerId, { orderId }),
    });
    setBotLLMForTests({
      provider: new FakeLLMProvider([
        fakeToolCall("mark_delivered", { orderId }),
        fakeText("unused"),
      ]),
      model: "fake-model",
      prices,
    });
    const sellerEvents: BotEvent[] = [];
    await handleMessage(
      {
        userId: sellerId,
        conversation: sellerThread.conversation!,
        text: "done, hand it in",
        ip: "127.0.0.1",
        locale: "en",
      },
      (event) => sellerEvents.push(event),
    );
    const deliver = sellerEvents.find(
      (event) => event.type === "confirm_request",
    ) as { confirmationId: string; fields: readonly string[] };
    expect(deliver.fields).toEqual(["deliveryUrl"]);
    await confirmAction({
      userId: sellerId,
      conversation: sellerThread.conversation!,
      confirmationId: deliver.confirmationId,
      accept: true,
      fields: { deliveryUrl: "https://example.com/second", links: "x" },
    });
    const read = await runTool(ctx(buyerId), "get_order", { orderId });
    expect(read.llm).toContain('"status":"delivered"');
    // The URL never reached the model's history.
    const history = JSON.stringify(sellerEvents);
    expect(history).not.toContain("example.com/second");
  });
});
