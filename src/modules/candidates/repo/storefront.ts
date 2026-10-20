import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidateProfiles, userProfiles } from "@/db/schema";

export type StorefrontRow = {
  userId: string;
  fullName: string | null;
  headline: string | null;
  timezone: string;
};

/** Only the fields a freelance storefront may show (D448). No contacts. */
export async function loadStorefrontRows(
  userIds: readonly string[],
): Promise<StorefrontRow[]> {
  if (userIds.length === 0) return [];
  return getDb()
    .select({
      userId: candidateProfiles.userId,
      // Name and zone from the shared profile, the candidate row as fallback (D508).
      fullName: sql<
        string | null
      >`coalesce(${userProfiles.displayName}, ${candidateProfiles.fullName})`,
      headline: candidateProfiles.headline,
      timezone: sql<string>`coalesce(${userProfiles.timezone}, ${candidateProfiles.timezone})`,
    })
    .from(candidateProfiles)
    .leftJoin(userProfiles, eq(userProfiles.userId, candidateProfiles.userId))
    .where(inArray(candidateProfiles.userId, [...userIds]));
}
