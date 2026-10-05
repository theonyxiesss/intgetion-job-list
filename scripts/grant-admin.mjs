import pg from "pg";
import { loadLocalEnv, pgConfig, redact } from "./db-url.mjs";

// D21 / D253: platform admins are appointed by this script, never through the
// UI. Usage:
//   pnpm admin:grant <login email> [role]
// role defaults to owner. Needs DATABASE_MIGRATION_URL.
loadLocalEnv();

const roles = new Set([
  "owner",
  "admin",
  "moderator",
  "support",
  "analyst",
  "marketing",
]);
const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3]?.trim().toLowerCase() || "owner";
if (!email || !email.includes("@") || !roles.has(role)) {
  console.error("Usage: pnpm admin:grant <login email> [role]");
  process.exit(1);
}

const connectionString = process.env.DATABASE_MIGRATION_URL;
if (!connectionString) {
  console.error("DATABASE_MIGRATION_URL is not set.");
  process.exit(1);
}

const client = new pg.Client(pgConfig(connectionString));
try {
  await client.connect();
  await client.query("BEGIN");
  const found = await client.query(
    `SELECT u.id
       FROM public.users u
       JOIN auth.users a ON a.id = u.auth_uid
      WHERE lower(a.email) = $1`,
    [email],
  );
  if (found.rowCount !== 1) {
    await client.query("ROLLBACK");
    console.error("no such user");
    process.exitCode = 1;
  } else {
    const userId = found.rows[0].id;
    await client.query(
      `UPDATE public.users SET platform_role = 'admin' WHERE id = $1`,
      [userId],
    );
    await client.query(
      `INSERT INTO public.admin_members (user_id, role)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET role = EXCLUDED.role, disabled_at = NULL`,
      [userId, role],
    );
    await client.query(
      `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, diff)
       VALUES (NULL, 'admin.granted', 'user', $1, $2::jsonb)`,
      [userId, JSON.stringify({ via: "grant-admin script", role })],
    );
    await client.query("COMMIT");
    console.log("admin granted");
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(redact(error instanceof Error ? error.message : error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
