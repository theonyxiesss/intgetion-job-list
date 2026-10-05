import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { deleteAuthUser, getAuthUserEmail } from "@/lib/supabase/admin";
import {
  linkTelegram,
  signInWithTelegram,
  unlinkTelegram,
} from "../service/auth-service";
import { confirmEmailAdd, requestEmailAdd } from "../service/email-change";

const botToken = "777000:integration-bot";
const telegramId = 900_000_000 + Math.floor(Math.random() * 1_000_000);
const otherTelegramId = telegramId + 1;
const realEmail = `tg-${telegramId}@example.com`;
const authUids = new Set<string>();

function signedResult(now: Date, id = telegramId): string {
  const fields: Record<string, string | number> = {
    id,
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
  "Telegram sign-in against Supabase Auth (D217, D230, D231)",
  () => {
    let userId = "";

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
      userId = user.id;
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
      const [link] = await getDb().execute<{ user_id: string }>(sql`
        select user_id from public.telegram_accounts
        where telegram_id = ${telegramId}
      `);
      expect(link?.user_id).toBe(user.id);
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

    it("keeps Telegram as the only sign-in until an email is added", async () => {
      const [user] = await getDb().execute<{
        id: string;
        auth_uid: string;
      }>(sql`select id, auth_uid from public.users where id = ${userId}`);
      await expect(
        unlinkTelegram({ id: user!.id, authUid: user!.auth_uid } as never),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("adds a real email; Telegram still signs into the same account", async () => {
      const [row] = await getDb().execute<{ auth_uid: string }>(
        sql`select auth_uid from public.users where id = ${userId}`,
      );
      const user = { id: userId, authUid: row!.auth_uid } as never;
      const sent: string[] = [];
      await requestEmailAdd(
        user,
        { email: realEmail, locale: "en" },
        async (message) => {
          sent.push(message.text);
          return "sent";
        },
      );
      const token = decodeURIComponent(
        /token=([^\s]+)/.exec(sent[0] ?? "")?.[1] ?? "",
      );
      expect(await confirmEmailAdd(token)).toEqual({ ok: true });
      expect(await getAuthUserEmail(row!.auth_uid)).toBe(realEmail);

      const now = new Date();
      const again = await signInWithTelegram(
        browserAuth(),
        { result: signedResult(now), locale: "en" },
        botToken,
        now,
      );
      expect(again.id).toBe(userId);
    });

    it("lets a Telegram belong to one account only", async () => {
      const now = new Date();
      // A second Telegram id makes a second account…
      const other = await signInWithTelegram(
        browserAuth(),
        { result: signedResult(now, otherTelegramId), locale: "en" },
        botToken,
        now,
      );
      authUids.add(other.authUid);
      // …and the first Telegram cannot be linked to it.
      await expect(
        linkTelegram(other, signedResult(now), botToken, now),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("unlinks Telegram once the account has an email", async () => {
      const [row] = await getDb().execute<{ auth_uid: string }>(
        sql`select auth_uid from public.users where id = ${userId}`,
      );
      await unlinkTelegram({ id: userId, authUid: row!.auth_uid } as never);
      const links = await getDb().execute(sql`
        select 1 from public.telegram_accounts where user_id = ${userId}
      `);
      expect(links).toHaveLength(0);
    });
  },
);
