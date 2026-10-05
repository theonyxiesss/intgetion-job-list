import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { deleteAuthUser } from "@/lib/supabase/admin";
import { loadLocalEnv } from "../../../../scripts/db-url.mjs";

loadLocalEnv();
import { deleteTelegramLoginChallenge } from "../repo/telegram-login";
import {
  beginTelegramBotLogin,
  finishTelegramBotLogin,
  handleTelegramWebhook,
} from "../service/telegram-login";
import { telegramLoginCodeHash } from "../service/telegram";

const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get(name: string) {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string) {
      if (!value) jar.delete(name);
      else jar.set(name, value);
    },
  }),
}));

const botToken = "777000:integration-bot";
const telegramId = 910_000_000 + Math.floor(Math.random() * 1_000_000);
const authUids = new Set<string>();
const realFetch = globalThis.fetch;

function browserAuth() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).auth;
}

afterAll(async () => {
  vi.unstubAllGlobals();
  const code = jar.get("tg_login");
  if (code) {
    await deleteTelegramLoginChallenge(telegramLoginCodeHash(code)).catch(
      () => undefined,
    );
  }
  for (const authUid of authUids) {
    await getDb().execute(sql`delete from users where auth_uid = ${authUid}`);
    await deleteAuthUser(authUid);
  }
});

const ready = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.DATABASE_URL,
);

describe.skipIf(!ready)("bot sign-in against the database (D256)", () => {
  it("goes start, pending, webhook tap, then signed in", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.NEXT_PUBLIC_SITE_URL ??= "http://127.0.0.1:3000";
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("api.telegram.org")) {
          return new Response(
            JSON.stringify({ ok: true, result: { username: "intgetion_bot" } }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return realFetch(input, init);
      },
    );

    const started = await beginTelegramBotLogin("ru");
    const code = jar.get("tg_login") ?? "";
    expect(started.url).toContain(`login_${code}`);
    expect(await finishTelegramBotLogin(browserAuth())).toBe("pending");

    await handleTelegramWebhook(botToken, {
      message: {
        text: `/start login_${code}`,
        chat: { id: 11 },
        from: {
          id: telegramId,
          username: "intgetion_test",
          first_name: "Test",
        },
      },
    });
    expect(await finishTelegramBotLogin(browserAuth())).toBe("pending");

    await handleTelegramWebhook(botToken, {
      callback_query: {
        id: "cb-integration",
        data: `login_${code}`,
        from: {
          id: telegramId,
          username: "intgetion_test",
          first_name: "Test",
        },
        message: { chat: { id: 11 } },
      },
    });

    const auth = browserAuth();
    expect(await finishTelegramBotLogin(auth)).toBe("signed-in");
    const { data } = await auth.getUser();
    expect(data.user?.id).toBeTruthy();
    if (data.user) authUids.add(data.user.id);
    expect(jar.has("tg_login")).toBe(false);
  });
});
