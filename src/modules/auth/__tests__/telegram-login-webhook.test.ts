import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("../service/telegram-bot", () => ({
  answerTelegramCallback: vi.fn(async () => undefined),
  ensureTelegramWebhook: vi.fn(async () => undefined),
  sendTelegramMessage: vi.fn(async () => undefined),
  telegramBotUsername: vi.fn(async () => "intgetion_bot"),
}));

vi.mock("../repo/telegram-login", () => ({
  findTelegramLoginChallenge: vi.fn(),
  claimTelegramLoginPrompt: vi.fn(),
  releaseTelegramLoginPrompt: vi.fn(),
  confirmTelegramLoginChallenge: vi.fn(),
  insertTelegramLoginChallenge: vi.fn(),
  deleteExpiredTelegramLogins: vi.fn(),
  deleteTelegramLoginChallenge: vi.fn(),
}));

import { cookies } from "next/headers";
import * as challenges from "../repo/telegram-login";
import {
  answerTelegramCallback,
  sendTelegramMessage,
} from "../service/telegram-bot";
import {
  beginTelegramBotLogin,
  handleTelegramWebhook,
} from "../service/telegram-login";
import { newTelegramLoginCode } from "../service/telegram";

const find = vi.mocked(challenges.findTelegramLoginChallenge);
const claim = vi.mocked(challenges.claimTelegramLoginPrompt);
const release = vi.mocked(challenges.releaseTelegramLoginPrompt);
const confirm = vi.mocked(challenges.confirmTelegramLoginChallenge);
const insert = vi.mocked(challenges.insertTelegramLoginChallenge);
const send = vi.mocked(sendTelegramMessage);
const answer = vi.mocked(answerTelegramCallback);

const liveRow = {
  locale: "ru",
  confirmedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  username: null,
  telegramId: null,
};

describe("telegram bot login on a phone (D426)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = "123456:test-bot-token";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  });

  it("sends the sign-in button once when the same start arrives twice", async () => {
    const code = newTelegramLoginCode();
    find.mockResolvedValue(liveRow as never);
    claim.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const update = {
      message: {
        text: `/start login_${code}`,
        chat: { id: 7 },
        from: { id: 42, first_name: "Ann" },
      },
    };
    await handleTelegramWebhook("123456:test-bot-token", update);
    await handleTelegramWebhook("123456:test-bot-token", update);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[2]).toContain("INTGETION");
    expect(send.mock.calls[0]?.[2]).not.toContain("уже открыт");
  });

  it("tells the person to return to the tab, and a second tap adds no message", async () => {
    const code = newTelegramLoginCode();
    confirm.mockResolvedValueOnce({ id: "row" } as never);
    find.mockResolvedValue({ ...liveRow, confirmedAt: new Date() } as never);
    const tap = {
      callback_query: {
        id: "cb",
        data: `login_${code}`,
        from: { id: 42 },
        message: { chat: { id: 7 } },
      },
    };
    await handleTelegramWebhook("123456:test-bot-token", tap);
    expect(send.mock.calls[0]?.[2]).toContain("вкладку браузера");
    expect(send.mock.calls[0]?.[2]).not.toContain("уже открыт");

    confirm.mockResolvedValueOnce(null);
    await handleTelegramWebhook("123456:test-bot-token", tap);
    expect(send).toHaveBeenCalledTimes(1);
    expect(answer).toHaveBeenCalledTimes(2);
  });

  it("releases the claim when the message fails, so a retry can send it", async () => {
    const code = newTelegramLoginCode();
    find.mockResolvedValue(liveRow as never);
    claim.mockResolvedValue(true);
    send.mockRejectedValueOnce(new Error("telegram down"));
    await expect(
      handleTelegramWebhook("123456:test-bot-token", {
        message: {
          text: `/start login_${code}`,
          chat: { id: 7 },
          from: { id: 42 },
        },
      }),
    ).rejects.toThrow("telegram down");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("reuses the live cookie instead of opening a second code", async () => {
    const code = newTelegramLoginCode();
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(() => ({ value: code })),
      set,
    } as never);
    find.mockResolvedValue(liveRow as never);
    const started = await beginTelegramBotLogin("ru", "signin");
    expect(started.url).toBe(`https://t.me/intgetion_bot?start=login_${code}`);
    expect(insert).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      "tg_wait",
      "signin",
      expect.objectContaining({ httpOnly: false }),
    );
  });
});
