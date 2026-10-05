import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { deleteAuthUser } from "@/lib/supabase/admin";
import { signInWithTelegramProfile } from "../service/auth-service";
import {
  newTelegramLoginCode,
  telegramLoginCodeHash,
  TELEGRAM_LOGIN_TTL_SECONDS,
} from "../service/telegram";
import { handleTelegramWebhook } from "../service/telegram-login";
import * as challenges from "../repo/telegram-login";

const botToken = "777000:integration-bot";
const telegramId = 910_000_000 + Math.floor(Math.random() * 1_000_000);
const chatId = 5_000_001;
const authUids = new Set<string>();
const hashes = new Set<string>();

/** Every Telegram API call the bot makes, so the test can read the replies. */
function stubTelegram(): { calls: { method: string; body: Request1 }[] } {
  const calls: { method: string; body: Request1 }[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({
      method: String(url).split("/").pop() ?? "",
      body: JSON.parse(String(init?.body ?? "{}")) as Request1,
    });
    return new Response(JSON.stringify({ ok: true, result: {} }), {
      headers: { "content-type": "application/json" },
    });
  });
  return { calls };
}
type Request1 = Record<string, unknown> & {
  text?: string;
  reply_markup?: {
    inline_keyboard: { text: string; callback_data: string }[][];
  };
};

async function freshChallenge(locale: "en" | "ru" = "en"): Promise<string> {
  const code = newTelegramLoginCode();
  const hash = telegramLoginCodeHash(code);
  hashes.add(hash);
  await challenges.insertTelegramLoginChallenge({
    codeHash: hash,
    locale,
    expiresAt: new Date(Date.now() + TELEGRAM_LOGIN_TTL_SECONDS * 1000),
  });
  return code;
}

function browserAuth() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).auth;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  for (const hash of hashes) {
    await challenges.deleteTelegramLoginChallenge(hash);
  }
  for (const authUid of authUids) {
    await getDb().execute(sql`delete from users where auth_uid = ${authUid}`);
    await deleteAuthUser(authUid);
  }
});

describe("Telegram bot sign-in (D256)", () => {
  it("offers a sign-in button for a live code and nothing for a stranger", async () => {
    const code = await freshChallenge("ru");
    const { calls } = stubTelegram();
    await handleTelegramWebhook(botToken, {
      message: {
        text: `/start login_${code}`,
        chat: { id: chatId },
        from: { id: telegramId, first_name: "Test" },
      },
    });
    const sent = calls.filter((call) => call.method === "sendMessage");
    expect(sent).toHaveLength(1);
    // Russian challenge → Russian wording, whatever the chat language is.
    expect(String(sent[0]?.body.text)).toContain("INTGETION");
    expect(sent[0]?.body.reply_markup?.inline_keyboard[0]?.[0]).toMatchObject({
      callback_data: `login_${code}`,
    });

    // A code nobody issued gets the same answer as an unknown one: no button.
    const other = stubTelegram();
    await handleTelegramWebhook(botToken, {
      message: {
        text: `/start login_${newTelegramLoginCode()}`,
        chat: { id: chatId },
        from: { id: telegramId },
      },
    });
    const refused = other.calls.filter((call) => call.method === "sendMessage");
    expect(refused).toHaveLength(1);
    expect(refused[0]?.body.reply_markup).toBeUndefined();
  });

  it("ignores messages that are not a start command, and other bots", async () => {
    const { calls } = stubTelegram();
    await handleTelegramWebhook(botToken, {
      message: {
        text: "hello there",
        chat: { id: chatId },
        from: { id: telegramId },
      },
    });
    await handleTelegramWebhook(botToken, {
      message: {
        text: "/start",
        chat: { id: chatId },
        from: { id: telegramId, is_bot: true },
      },
    });
    expect(calls).toHaveLength(0);
  });

  it("confirms the challenge on a tap, and a second tap changes nothing", async () => {
    const code = await freshChallenge();
    const hash = telegramLoginCodeHash(code);
    stubTelegram();
    const tap = {
      callback_query: {
        id: "cb1",
        data: `login_${code}`,
        from: { id: telegramId, username: "intgetion_test" },
        message: { chat: { id: chatId } },
      },
    };
    await handleTelegramWebhook(botToken, tap);
    const confirmed = await challenges.findTelegramLoginChallenge(hash);
    expect(confirmed?.confirmedAt).toBeTruthy();
    expect(confirmed?.telegramId).toBe(String(telegramId));

    await handleTelegramWebhook(botToken, tap);
    const again = await challenges.findTelegramLoginChallenge(hash);
    expect(again?.confirmedAt?.getTime()).toBe(
      confirmed?.confirmedAt?.getTime(),
    );
  });

  it("does not confirm an expired challenge", async () => {
    const code = newTelegramLoginCode();
    const hash = telegramLoginCodeHash(code);
    hashes.add(hash);
    await challenges.insertTelegramLoginChallenge({
      codeHash: hash,
      locale: "en",
      expiresAt: new Date(Date.now() - 1000),
    });
    stubTelegram();
    await handleTelegramWebhook(botToken, {
      callback_query: {
        id: "cb2",
        data: `login_${code}`,
        from: { id: telegramId },
        message: { chat: { id: chatId } },
      },
    });
    const row = await challenges.findTelegramLoginChallenge(hash);
    expect(row?.confirmedAt).toBeNull();
  });
});

// Needs Supabase Auth and its admin key: ci-db.sh runs it once they are set.
const authReady = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.skipIf(!authReady)("the confirmed profile signs in (D256)", () => {
  it("creates the account from the bot profile alone", async () => {
    const user = await signInWithTelegramProfile(
      browserAuth(),
      { id: telegramId, username: "intgetion_test" },
      "ru",
    );
    authUids.add(user.authUid);
    expect(user.status).toBe("active");
    expect(user.locale).toBe("ru");
  });
});
