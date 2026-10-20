import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userProfiles } from "@/db/schema";
import type { SharedProfile } from "../service/shared-profile";

/** A connection or a transaction (Drizzle). */
type Conn = Pick<ReturnType<typeof getDb>, "select" | "insert">;

export async function findSharedProfile(
  userId: string,
  conn: Conn = getDb(),
): Promise<SharedProfile | null> {
  const [row] = await conn
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    displayName: row.displayName,
    country: row.country,
    city: row.city,
    timezone: row.timezone,
    languages: row.languages ?? [],
    about: row.about,
  };
}

export async function saveSharedProfile(
  userId: string,
  profile: SharedProfile,
  conn: Conn = getDb(),
): Promise<void> {
  await conn
    .insert(userProfiles)
    .values({ userId, ...profile })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...profile, updatedAt: new Date() },
    });
}
