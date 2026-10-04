import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { deleteAuthUser, getAuthUserEmail } from "@/lib/supabase/admin";
import { signInWithTelegram } from "../service/auth-service";

const botToken = "777000:integration-bot";
const telegramId = 900_000_000 + Math.floor(Math.random() * 1_000_000);
const authUids = new Set<string>();

function signedResult(now: Date): string {
  const fields: Record<string, string | number> = {
    id: telegramId,
    first_name: "Test",
    username: "intgetion_test",
    auth_date: Math.floor(now.getTime() / 1000),
  };
  const check = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return Buffer.from(JSON.stringify({ ...fields, hash })).toString("base64");
}

function browserAuth() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).auth;
}

afterAll(async () => {
  for (const authUid of authUids) {
    await getDb().execute(sql`delete from users where auth_uid = ${authUid}`);
    await deleteAuthUser(authUid);
  }
});

// Needs Supabase Auth and its admin key: ci-db.sh runs it once they are set.
const authReady = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.skipIf(!authReady)(
  "Telegram sign-in against Supabase Auth (D217)",
  () => {
    it("creates the user once and signs the same user in again", async () => {
      const now = new Date();
      const first = browserAuth();
      const user = await signInWithTelegram(
        first,
        { result: signedResult(now), locale: "ru" },
        botToken,
        now,
      );
      authUids.add(user.authUid);
      expect(user.locale).toBe("ru");
      expect(user.status).toBe("active");
      const { data } = await first.getUser();
      expect(data.user?.email).toBe(`tg${telegramId}@telegram.intgetion.com`);
      // Placeholder addresses are never handed to the mailer.
      expect(await getAuthUserEmail(user.authUid)).toBeNull();

      const again = await signInWithTelegram(
        browserAuth(),
        { result: signedResult(now), locale: "en" },
        botToken,
        now,
      );
      expect(again.id).toBe(user.id);
      expect(again.locale).toBe("ru");
    });

    it("refuses a forged payload without touching Supabase", async () => {
      const now = new Date();
      await expect(
        signInWithTelegram(
          browserAuth(),
          { result: signedResult(now), locale: "en" },
          "777000:another-bot",
          now,
        ),
      ).rejects.toMatchObject({ status: 401 });
    });
  },
);
