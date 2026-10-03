import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  listSkillSuggestions,
  mapSkillSuggestion,
  normalizeSkill,
  rejectSkillSuggestion,
} from "@/modules/taxonomy/service";
import { listAudit, listUsers } from "../service/admin-service";

// Letters only: normalizeSkillText drops digits that look like versions (D42).
const marker = `zz${randomUUID()
  .replace(/-/g, "")
  .slice(0, 12)
  .replace(/[0-9]/g, (digit) => "ghijklmnop"[Number(digit)]!)}`;
const userIds: string[] = [];

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from skills_aliases where alias_normalized like ${marker + "%"}`,
  );
  await db.execute(
    sql`delete from skill_suggestions where normalized like ${marker + "%"}`,
  );
  for (const id of userIds) {
    await db.execute(sql`delete from audit_logs where entity_id = ${id}`);
    await db.execute(sql`delete from users where id = ${id}`);
  }
});

describe("skill suggestion review (10A)", () => {
  it("maps a suggestion so normalizeSkill matches it afterwards", async () => {
    const raw = `${marker}lang`;
    const first = await normalizeSkill(raw);
    expect(first.result).toBe("suggested");
    if (first.result !== "suggested") return;

    const listed = await listSkillSuggestions({ limit: 50 });
    expect(listed.items.some((item) => item.id === first.suggestionId)).toBe(
      true,
    );

    const react = await normalizeSkill("React");
    expect(react.result).toBe("matched");
    if (react.result !== "matched") return;

    await mapSkillSuggestion(first.suggestionId, react.skillId);
    const after = await normalizeSkill(raw);
    expect(after).toMatchObject({ result: "matched", skillId: react.skillId });

    await expect(
      mapSkillSuggestion(first.suggestionId, react.skillId),
    ).rejects.toMatchObject({ status: 409, code: "ALREADY_DECIDED" });
  });

  it("rejects a suggestion once", async () => {
    const result = await normalizeSkill(`${marker}other`);
    if (result.result !== "suggested") throw new Error("expected suggestion");
    await rejectSkillSuggestion(result.suggestionId);
    await expect(
      rejectSkillSuggestion(result.suggestionId),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("answers 404 for an unknown suggestion or skill", async () => {
    await expect(
      mapSkillSuggestion(randomUUID(), randomUUID()),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("admin lists", () => {
  it("pages users newest first and filters by exact id", async () => {
    for (let i = 0; i < 3; i += 1) {
      const rows = await getDb().execute<{ id: string }>(sql`
        insert into users (auth_uid, terms_accepted_at, terms_version)
        values (gen_random_uuid(), now(), 'admin-it') returning id
      `);
      userIds.push(rows[0]!.id);
    }
    const byId = await listUsers({ limit: 20, id: userIds[1] });
    expect(byId.items.map((user) => user.id)).toEqual([userIds[1]]);

    const firstPage = await listUsers({ limit: 1 });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).toBeTruthy();
    const secondPage = await listUsers({
      limit: 1,
      cursor: firstPage.nextCursor ?? undefined,
    });
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
  });

  it("filters audit rows by action", async () => {
    const result = await listAudit({ limit: 5, action: "no-such-action" });
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
