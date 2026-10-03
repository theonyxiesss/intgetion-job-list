import pg from "pg";
import { loadLocalEnv, pgConfig, redact } from "./db-url.mjs";

// D21: platform admins are appointed by this script (or the same SQL in the
// Supabase SQL editor), never through the UI. Usage:
//   pnpm admin:grant <login email>
// Needs DATABASE_MIGRATION_URL with read access to auth.users. The grant is
// recorded in audit_logs with no actor.
loadLocalEnv();

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: pnpm admin:grant <login email>");
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
  const updated = await client.query(
    `UPDATE public.users u
        SET platform_role = 'admin'
       FROM auth.users a
      WHERE a.id = u.auth_uid
        AND lower(a.email) = $1
        AND u.platform_role <> 'admin'
      RETURNING u.id`,
    [email],
  );
  if (updated.rowCount === 1) {
    await client.query(
      `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, diff)
       VALUES (NULL, 'admin.granted', 'user', $1, '{"via":"grant-admin script"}')`,
      [updated.rows[0].id],
    );
    await client.query("COMMIT");
    console.log("admin granted");
  } else {
    await client.query("ROLLBACK");
    console.error("no such user, or already an admin");
    process.exitCode = 1;
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(redact(error instanceof Error ? error.message : error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
