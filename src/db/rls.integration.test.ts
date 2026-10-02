import { sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const appUrl = process.env.DATABASE_URL;

if (!migrationUrl || !appUrl) {
  throw new Error(
    "Integration tests need DATABASE_MIGRATION_URL and DATABASE_URL.",
  );
}

const admin = new pg.Client({ connectionString: migrationUrl });

afterAll(async () => {
  await admin.end();
});

describe("users access", () => {
  beforeAll(async () => {
    await admin.connect();
  });

  it("lets app_rw write a user and keeps anon from seeing it", async () => {
    const inserted = await getDb().execute<{ id: string }>(sql`
      insert into users (auth_uid, terms_accepted_at, terms_version)
      values (gen_random_uuid(), now(), 'integration')
      returning id
    `);
    const id = inserted[0]?.id;
    expect(id).toBeTruthy();

    await admin.query("BEGIN");
    await admin.query("SET LOCAL ROLE anon");
    const visible = await admin.query(
      "SELECT id FROM public.users WHERE id = $1",
      [id],
    );
    expect(visible.rowCount).toBe(0);
    await expect(
      admin.query(
        `INSERT INTO public.users (auth_uid, terms_accepted_at, terms_version)
         VALUES (gen_random_uuid(), now(), 'nope')`,
      ),
    ).rejects.toThrow();
    await admin.query("ROLLBACK");

    await getDb().execute(sql`delete from users where id = ${id}`);
  });

  it("answers a database ping through the app role", async () => {
    const rows = await getDb().execute<{ ok: number }>(sql`select 1 as ok`);
    expect(Number(rows[0]?.ok)).toBe(1);
  });
});
