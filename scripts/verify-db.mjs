import pg from "pg";
import { loadLocalEnv, redact } from "./db-url.mjs";

loadLocalEnv();

const connectionString = process.env.DATABASE_MIGRATION_URL;
if (!connectionString) {
  console.error("DATABASE_MIGRATION_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

try {
  await client.connect();

  const role = await client.query(
    `SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin
     FROM pg_roles WHERE rolname = 'app_rw'`,
  );
  expect(role.rowCount === 1, "role app_rw does not exist");
  const flags = role.rows[0];
  expect(flags && flags.rolsuper === false, "app_rw must not be superuser");
  expect(
    flags && flags.rolcreatedb === false,
    "app_rw must not create databases",
  );
  expect(
    flags && flags.rolcreaterole === false,
    "app_rw must not create roles",
  );
  expect(flags && flags.rolcanlogin === true, "app_rw must be able to log in");

  const users = await client.query(
    `SELECT c.relrowsecurity, c.relforcerowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'users'`,
  );
  expect(users.rowCount === 1, "table users does not exist");
  expect(users.rows[0]?.relrowsecurity === true, "users RLS is not enabled");
  expect(
    users.rows[0]?.relforcerowsecurity === true,
    "users RLS is not forced",
  );

  const policies = await client.query(
    `SELECT polname, pg_get_expr(polqual, polrelid) AS qual
     FROM pg_policy
     WHERE polrelid = 'public.users'::regclass
     ORDER BY polname`,
  );
  const byName = new Map(policies.rows.map((row) => [row.polname, row]));
  for (const name of [
    "users_anon_deny",
    "users_authenticated_deny",
    "users_app_rw_all",
  ]) {
    expect(byName.has(name), `missing policy ${name}`);
  }
  const anonQual = byName.get("users_anon_deny")?.qual;
  const authenticatedQual = byName.get("users_authenticated_deny")?.qual;
  expect(
    anonQual === "false" || anonQual === "(false)",
    "anon policy is not deny-all",
  );
  expect(
    authenticatedQual === "false" || authenticatedQual === "(false)",
    "authenticated policy is not deny-all",
  );

  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL ROLE anon");
    await client.query("SAVEPOINT anon_write");
    let insertFailed = false;
    try {
      await client.query(
        `INSERT INTO public.users (auth_uid, terms_accepted_at, terms_version)
         VALUES (gen_random_uuid(), now(), 'deny')`,
      );
    } catch {
      insertFailed = true;
      await client.query("ROLLBACK TO SAVEPOINT anon_write");
    }
    expect(insertFailed, "anon insert was not denied");
    const visible = await client.query("SELECT id FROM public.users");
    expect(visible.rowCount === 0, "anon can read users");
  } finally {
    await client.query("ROLLBACK");
  }

  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL ROLE app_rw");
    let ddlFailed = false;
    try {
      await client.query("CREATE TABLE public.app_rw_should_fail (id int)");
    } catch {
      ddlFailed = true;
    }
    expect(ddlFailed, "app_rw was able to create a table");
  } finally {
    await client.query("ROLLBACK");
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
  } else {
    console.log("app_rw exists and users RLS denies anon and authenticated");
  }
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
