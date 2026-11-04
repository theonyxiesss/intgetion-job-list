import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { checkAuthHealth } from "@/lib/supabase/auth-health";

export const dynamic = "force-dynamic";

async function checkDb(): Promise<"up" | "down"> {
  try {
    await getDb().execute(sql`select 1`);
    return "up";
  } catch {
    return "down";
  }
}

/**
 * Uptime check (18.1, D606): PostgreSQL and Supabase Auth as separate parts.
 * `ok` is true only when both are up; otherwise 503, so the uptime alert
 * fires while nobody can sign in even if the database is fine. The body
 * names the part that is down and nothing else — no URL, key or provider
 * text.
 */
export async function GET() {
  const [db, auth] = await Promise.all([checkDb(), checkAuthHealth()]);
  const ok = db === "up" && auth === "up";
  return Response.json(
    { ok, db, auth },
    {
      status: ok ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
