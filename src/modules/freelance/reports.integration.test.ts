import { randomUUID } from "node:crypto";
import { inArray, or, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { freelanceOrders, users } from "@/db/schema";
import { HttpError } from "@/lib/http";
import {
  saveCandidateProfile,
  updateCandidateInput,
} from "@/modules/candidates/service";
import { listQueue, listReports } from "@/modules/moderation/service";
import { seedSkills } from "@/modules/taxonomy/service";
import {
  createService,
  decideServiceModeration,
  getPublishedService,
  reportFreelance,
  sendRequest,
  setAcceptingOrders,
  submitService,
} from "./service";

/** Complaints, the three-in-a-row hold and the moderator's flags (28.9, D462). */

const sellerId = randomUUID();
const reporters = [randomUUID(), randomUUID(), randomUUID()];
const strangerId = randomUUID();
const userIds = [sellerId, ...reporters, strangerId];
const token = sellerId.slice(0, 8);

async function rowsOf<T>(query: ReturnType<typeof sql>) {
  return (await getDb().execute(query)) as unknown as T[];
}

async function expectStatus(promise: Promise<unknown>, status: number) {
  try {
    await promise;
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(status);
  }
}

afterAll(async () => {
  const db = getDb();
  await db
    .delete(freelanceOrders)
    .where(
      or(
        inArray(freelanceOrders.sellerId, userIds),
        inArray(freelanceOrders.buyerId, userIds),
      ),
    );
  await db.execute(
    sql`delete from public.reports where reporter_id in (${sql.join(
      userIds.map((id) => sql`${id}`),
      sql`, `,
    )})`,
  );
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("freelance complaints (28.9)", () => {
  it("holds a service after three open complaints until a moderator decides", async () => {
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
        fullName: "Ada Lovelace",
        headline: "Designer",
        desiredTitles: ["Designer"],
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
    await setAcceptingOrders(sellerId, true);
    const service = await createService(sellerId, {
      title: `Logo and brand kit ${token}`,
      category: "design",
      description:
        "A logo, colours and a short brand guide for a Web3 product. Write me on WhatsApp for the details before we start.",
      languages: ["en"],
      links: ["https://t.me/ada_design"],
      packages: [
        {
          tier: "basic",
          price: "15",
          deliveryDays: 5,
          revisions: 1,
          includes: ["One logo"],
        },
      ],
    });
    await submitService(sellerId, service.id);

    // The flags reach the shared queue with the service (28.9).
    const queue = await listQueue({
      limit: 100,
      entityType: "freelance_service",
    });
    const item = queue.items.find((row) => row.entityId === service.id);
    expect(item?.riskFlags).toEqual(
      expect.arrayContaining([
        "price_very_low",
        "contacts_in_text",
        "contact_link",
      ]),
    );

    // Pending is not public, so it cannot be reported yet.
    await expectStatus(
      reportFreelance(
        reporters[0]!,
        { kind: "service", id: service.id },
        {
          reason: "spam",
        },
      ),
      404,
    );
    await decideServiceModeration(service.id, "publish", null);
    expect(await getPublishedService(service.slug)).not.toBeNull();

    // The owner cannot report their own service; bad reasons are refused.
    await expectStatus(
      reportFreelance(
        sellerId,
        { kind: "service", id: service.id },
        {
          reason: "spam",
        },
      ),
      409,
    );
    await expectStatus(
      reportFreelance(
        reporters[0]!,
        { kind: "service", id: service.id },
        {
          reason: "fake_company",
        },
      ),
      400,
    );

    // A stranger's order reads as not found; a buyer may report theirs.
    const order = await sendRequest(reporters[2]!, {
      serviceId: service.id,
      tier: "basic",
      task: "A logo for my wallet app, round and simple.",
    });
    await expectStatus(
      reportFreelance(
        strangerId,
        { kind: "order", id: order.id },
        {
          reason: "scam",
        },
      ),
      404,
    );

    const first = await reportFreelance(
      reporters[0]!,
      { kind: "service", id: service.id },
      { reason: "scam", details: "Asked to pay outside" },
    );
    expect(first.held).toBe(false);
    await expectStatus(
      reportFreelance(
        reporters[0]!,
        { kind: "service", id: service.id },
        {
          reason: "spam",
        },
      ),
      409,
    );
    const second = await reportFreelance(
      reporters[1]!,
      { kind: "service", id: service.id },
      { reason: "spam" },
    );
    expect(second.held).toBe(false);
    const third = await reportFreelance(
      reporters[2]!,
      { kind: "order", id: order.id },
      { reason: "scam" },
    );
    expect(third.held).toBe(true);

    // Out of the catalog, back in the queue, and the move is audited.
    expect(await getPublishedService(service.slug)).toBeNull();
    const held = await listQueue({
      limit: 100,
      entityType: "freelance_service",
    });
    expect(
      held.items.find(
        (row) =>
          row.entityId === service.id &&
          row.reason === "freelance_service_reports",
      )?.riskFlags,
    ).toEqual(["reports_threshold"]);
    const audit = await rowsOf<{ action: string }>(sql`
      select action from public.audit_logs
      where entity_type = 'freelance_service' and entity_id = ${service.id}
    `);
    expect(audit.map((row) => row.action)).toContain("freelance.service_held");

    // The admin list names the service for both kinds of complaint.
    const open = await listReports({ limit: 100, status: "open" });
    const ours = open.items.filter((row) => row.serviceId === service.id);
    expect(ours).toHaveLength(3);
    expect(ours.every((row) => row.serviceTitle === service.title)).toBe(true);
  });
});
