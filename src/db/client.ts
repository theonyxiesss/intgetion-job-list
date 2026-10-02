import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { hostedSsl, withoutSslMode } from "./ssl";

let database: PostgresJsDatabase<typeof schema> | undefined;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  database ??= drizzle(
    postgres(withoutSslMode(url), {
      max: 1,
      prepare: false,
      ssl: hostedSsl(url),
    }),
    { schema },
  );
  return database;
}
