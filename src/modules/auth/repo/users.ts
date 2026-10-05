import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import type { SignupMetadata } from "../schemas";

export type UserRow = typeof users.$inferSelect;

/** Creates the row once per auth user; repeated callbacks keep the first one. */
export async function insertUserIfMissing(
  authUid: string,
  metadata: SignupMetadata,
): Promise<UserRow> {
  const db = getDb();
  await db
    .insert(users)
    .values({
      authUid,
      locale: metadata.locale,
      termsVersion: metadata.terms_version,
      termsAcceptedAt: new Date(metadata.terms_accepted_at),
    })
    .onConflictDoNothing({ target: users.authUid });
  const row = await findUserByAuthUid(authUid);
  if (!row) throw new Error("users row missing after insert");
  return row;
}

export async function findUserByAuthUid(
  authUid: string,
): Promise<UserRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(users)
    .where(eq(users.authUid, authUid))
    .limit(1);
  return row;
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row;
}

export async function updateUser(
  id: string,
  patch: { locale?: "en" | "ru"; marketingOptIn?: boolean },
): Promise<UserRow> {
  const [row] = await getDb()
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("users row vanished during update");
  return row;
}
