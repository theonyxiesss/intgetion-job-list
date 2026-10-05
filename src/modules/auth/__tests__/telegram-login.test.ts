import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => new Map<string, string>());

const challenges = vi.hoisted(() => ({
  deleteExpiredTelegramLogins: vi.fn(async () => undefined),
  insertTelegramLoginChallenge: vi.fn(async () => undefined),
  findTelegramLoginChallenge: vi.fn(),
  confirmTelegramLoginChallenge: vi.fn(),
  deleteTelegramLoginChallenge: vi.fn(async () => undefined),
}));

const bot = vi.hoisted(() => ({
  answerTelegramCallback: vi.fn(async () => undefined),
  ensureTelegramWebhook: vi.fn(async () => undefined),
  sendTelegramMessage: vi.fn(async () => undefined),
  telegramBotUsername: vi.fn(async () => "intgetion_bot"),
}));

const signInWithTelegramProfile = vi.hoisted(() =>
  vi.fn(async () => ({ id: "user" })),
);

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

vi.mock("../repo/telegram-login", () => challenges);
vi.mock("../service/telegram-bot", () => bot);
vi.mock("../service/auth-service", () => ({ signInWithTelegramProfile }));

import { telegramLoginCodeHash } from "../service/telegram";
import {
  beginTelegramBotLogin,
  finishTelegramBotLogin,
  handleTelegramWebhook,
} from "../service/telegram-login";

const token = "123456:test-bot-token";
const future = new Date(Date.now() + 60 * 60 * 1000);
const savedEnv = {
  token: process.env.TELEGRAM_BOT_TOKEN,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  site: process.env.NEXT_PUBLIC_SITE_URL,
};

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  jar.clear();
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = token;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-key";
  process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3000";
});

afterEach(() => {
  restoreEnv("TELEGRAM_BOT_TOKEN", savedEnv.token);
  restoreEnv("SUPABASE_SERVICE_ROLE_KEY", savedEnv.key);
  restoreEnv("NEXT_PUBLIC_SITE_URL", savedEnv.site);
});

describe("bot sign-in service (D256)", () => {
  it("stores only the hash and returns a t.me link", async () => {
    const started = await beginTelegramBotLogin("ru");
    const code = jar.get("tg_login") ?? "";
    expect(started.url).toBe(`https://t.me/intgetion_bot?start=login_${code}`);
    expect(challenges.insertTelegramLoginChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        codeHash: telegramLoginCodeHash(code),
        locale: "ru",
      }),
    );
    expect(telegramLoginCodeHash(code)).not.toBe(code);
  });

  it("stays pending until the bot tap, then signs in once", async () => {
    const code = "a".repeat(24);
    jar.set("tg_login", code);
    const row = {
      codeHash: telegramLoginCodeHash(code),
      locale: "ru",
      expiresAt: future,
      confirmedAt: null as Date | null,
      telegramId: null as string | null,
      username: null as string | null,
      firstName: null as string | null,
    };
    challenges.findTelegramLoginChallenge.mockImplementation(async () => row);
    expect(await finishTelegramBotLogin({} as never)).toBe("pending");

    challenges.confirmTelegramLoginChallenge.mockImplementation(async () => {
      row.confirmedAt = new Date("2026-10-05T12:00:00Z");
      row.telegramId = "42";
      row.username = "ann";
      return row;
    });
    await handleTelegramWebhook(token, {
      callback_query: {
        id: "cb",
        data: `login_${code}`,
        from: { id: 42, username: "ann", first_name: "Ann" },
        message: { chat: { id: 7 } },
      },
    });
    expect(bot.sendTelegramMessage).toHaveBeenCalledWith(
      token,
      7,
      expect.stringContaining("Готово"),
      undefined,
    );

    expect(await finishTelegramBotLogin({} as never)).toBe("signed-in");
    expect(signInWithTelegramProfile).toHaveBeenCalledWith(
      {},
      { id: 42, username: "ann" },
      "ru",
      expect.any(Date),
    );
    expect(jar.has("tg_login")).toBe(false);
  });

  it("asks for a tap on /start and refuses an expired code", async () => {
    challenges.findTelegramLoginChallenge.mockResolvedValue({
      codeHash: "hash",
      locale: "en",
      expiresAt: future,
      confirmedAt: null,
      telegramId: null,
      username: null,
      firstName: null,
    });
    await handleTelegramWebhook(token, {
      message: {
        text: "/start login_" + "b".repeat(24),
        chat: { id: 3 },
        from: { id: 9, first_name: "Ann" },
      },
    });
    expect(bot.sendTelegramMessage).toHaveBeenCalledWith(
      token,
      3,
      expect.stringContaining("tap Sign in"),
      expect.objectContaining({ data: "login_" + "b".repeat(24) }),
    );

    challenges.confirmTelegramLoginChallenge.mockResolvedValue(null);
    challenges.findTelegramLoginChallenge.mockResolvedValue(null);
    await handleTelegramWebhook(token, {
      callback_query: {
        id: "cb2",
        data: "login_" + "c".repeat(24),
        from: { id: 9 },
        message: { chat: { id: 3 } },
      },
    });
    expect(bot.sendTelegramMessage).toHaveBeenCalledWith(
      token,
      3,
      expect.stringContaining("expired"),
      undefined,
    );
  });
});
