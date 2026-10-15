import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidateProfiles } from "@/db/schema";

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
      fullName: candidateProfiles.fullName,
      headline: candidateProfiles.headline,
      timezone: candidateProfiles.timezone,
    })
    .from(candidateProfiles)
    .where(inArray(candidateProfiles.userId, [...userIds]));
}
