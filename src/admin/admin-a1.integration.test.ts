import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  issueAdminSession,
  memberSectionsOpen,
  revokeAdminSession,
  writeAdminAudit,
} from "@/modules/admin-console/service";

const userId = randomUUID();

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("admin integration tests require a loopback database");
  }
  await getDb().execute(sql`
    insert into public.users (id, auth_uid, terms_accepted_at, terms_version, platform_role)
    values (${userId}, ${randomUUID()}, now(), 'test', 'admin')
  `);
  await getDb().execute(sql`
    insert into public.admin_members (user_id, role)
    values (${userId}, 'owner')
  `);
});

afterAll(async () => {
  await getDb().execute(sql`delete from public.users where id = ${userId}`);
});

describe("admin host session", () => {
  it("gives a member without MFA access to no section", async () => {
    expect(await memberSectionsOpen(userId)).toBe(false);
    const issued = await issueAdminSession({
      userId,
      userAgent: "Mozilla/5.0",
      country: "DE",
      ip: "127.0.0.1",
      requestId: randomUUID(),
    });
    expect(issued.ok).toBe(false);
    if (!issued.ok) expect(issued.reason).toBe("mfa_required");
  });

  it("records login, an action, and logout", async () => {
    await getDb().execute(sql`
      update public.admin_members
      set mfa_enrolled_at = now()
      where user_id = ${userId}
    `);
    const issued = await issueAdminSession({
      userId,
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
      country: "DE",
      ip: "127.0.0.1",
      requestId: randomUUID(),
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    await writeAdminAudit({
      actorId: userId,
      action: "admin.test_action",
      entityType: "user",
      entityId: userId,
      reason: "integration",
      ip: "127.0.0.1",
      requestId: randomUUID(),
      deviceClass: "desktop",
    });
    expect(
      await revokeAdminSession({
        token: issued.token,
        actorId: userId,
        ip: "127.0.0.1",
        requestId: randomUUID(),
      }),
    ).toBe(true);
    const rows = await getDb().execute<{ action: string }>(sql`
      select action from public.audit_logs
      where actor_id = ${userId}
        and action in ('admin.login', 'admin.logout', 'admin.test_action')
    `);
    const actions = new Set(rows.map((row) => row.action));
    expect(actions.has("admin.login")).toBe(true);
    expect(actions.has("admin.logout")).toBe(true);
    expect(actions.has("admin.test_action")).toBe(true);
  });
});
