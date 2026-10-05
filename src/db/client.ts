import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { hostedSsl, withoutSslMode } from "./ssl";

let database: PostgresJsDatabase<typeof schema> | undefined;

/**
 * Connections per serverless instance (D247). Through Supabase's
 * transaction pooler (port 6543) a few are cheap, and parallel queries must
 * not share one connection: postgres.js would pipeline them, and the
 * pooler leaves a pipelined query hanging. Elsewhere (session pooler,
 * direct, local) one connection, so the small session pool is not drained.
 */
export function maxConnections(url: string): number {
  try {
    return new URL(url).port === "6543" ? 4 : 1;
  } catch {
    return 1;
  }
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  database ??= drizzle(
    postgres(withoutSslMode(url), {
      max: maxConnections(url),
      prepare: false,
      ssl: hostedSsl(url),
    }),
    { schema },
  );
  return database;
}
