import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { findUserByAuthUid, insertUserIfMissing } from "../repo/users";

const authUid = randomUUID();

afterAll(async () => {
  await getDb().execute(sql`delete from users where auth_uid = ${authUid}`);
});

describe("users repo (app_rw)", () => {
  it("creates one row per auth user and keeps the first terms on repeat", async () => {
    const first = await insertUserIfMissing(authUid, {
      terms_version: "2026-10-03",
      terms_accepted_at: "2026-10-03T10:00:00.000Z",
      locale: "ru",
    });
    const second = await insertUserIfMissing(authUid, {
      terms_version: "later",
      terms_accepted_at: "2026-10-04T10:00:00.000Z",
      locale: "en",
    });

    expect(second.id).toBe(first.id);
    expect(second.termsVersion).toBe("2026-10-03");
    expect(second.locale).toBe("ru");
    expect(second.termsAcceptedAt.toISOString()).toBe(
      "2026-10-03T10:00:00.000Z",
    );

    const rows = await getDb().execute<{ n: number }>(
      sql`select count(*)::int as n from users where auth_uid = ${authUid}`,
    );
    expect(Number(rows[0]?.n)).toBe(1);
    expect((await findUserByAuthUid(authUid))?.id).toBe(first.id);
  });
});
