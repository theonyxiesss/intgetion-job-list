import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userProfiles } from "@/db/schema";
import type { SharedProfile } from "../service/shared-profile";

export async function findSharedProfile(
  userId: string,
): Promise<SharedProfile | null> {
  const [row] = await getDb()
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
): Promise<void> {
  await getDb()
    .insert(userProfiles)
    .values({ userId, ...profile })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...profile, updatedAt: new Date() },
    });
}
