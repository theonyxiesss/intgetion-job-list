import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isPlaceholderEmail } from "@/lib/supabase/admin";
import {
  decodeTelegramResult,
  telegramAuthUrl,
  telegramBotId,
  telegramBotToken,
  telegramEmail,
  verifyTelegramAuth,
} from "../service/telegram";

const token = "123456:test-bot-token";
const now = new Date("2026-10-04T12:00:00Z");
const authDate = Math.floor(now.getTime() / 1000) - 30;

function sign(fields: Record<string, string | number>, key = token) {
  const check = Object.keys(fields)
    .sort()
    .map((name) => `${name}=${fields[name]}`)
    .join("\n");
  const secret = createHash("sha256").update(key).digest();
  return {
    ...fields,
    hash: createHmac("sha256", secret).update(check).digest("hex"),
  };
}

const fields = {
  id: 42,
  first_name: "Ann",
  username: "ann",
  auth_date: authDate,
};

describe("Telegram sign-in (D217)", () => {
  it("accepts data signed with the bot token", () => {
    expect(verifyTelegramAuth(sign(fields), token, now)?.id).toBe(42);
  });

  it("refuses another bot's signature", () => {
    expect(
      verifyTelegramAuth(sign(fields, "999:other"), token, now),
    ).toBeNull();
  });

  it("refuses a changed field", () => {
    const signed = sign(fields);
    expect(verifyTelegramAuth({ ...signed, id: 43 }, token, now)).toBeNull();
  });

  it("refuses data older than an hour", () => {
    const old = sign({ ...fields, auth_date: authDate - 2 * 60 * 60 });
    expect(verifyTelegramAuth(old, token, now)).toBeNull();
  });

  it("refuses a malformed payload", () => {
    expect(verifyTelegramAuth({ id: "42" }, token, now)).toBeNull();
    expect(verifyTelegramAuth(null, token, now)).toBeNull();
  });

  it("decodes url-safe unpadded base64", () => {
    const json = JSON.stringify(sign(fields));
    const encoded = Buffer.from(json)
      .toString("base64")
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    expect(
      verifyTelegramAuth(decodeTelegramResult(encoded), token, now)?.id,
    ).toBe(42);
    expect(decodeTelegramResult("%%%")).toBeNull();
  });

  it("builds the confirmation URL from the bot id", () => {
    expect(telegramBotId(token)).toBe("123456");
    const url = new URL(
      telegramAuthUrl({
        botId: "123456",
        origin: "https://intgetion.com",
        returnTo: "https://intgetion.com/en/auth/telegram",
      }),
    );
    expect(url.origin).toBe("https://oauth.telegram.org");
    expect(url.searchParams.get("bot_id")).toBe("123456");
    expect(url.searchParams.get("return_to")).toBe(
      "https://intgetion.com/en/auth/telegram",
    );
  });

  it("reads only a well-formed token from env", () => {
    expect(telegramBotToken({ TELEGRAM_BOT_TOKEN: ` ${token} ` })).toBe(token);
    expect(telegramBotToken({ TELEGRAM_BOT_TOKEN: "nope" })).toBeNull();
    expect(telegramBotToken({})).toBeNull();
  });

  it("uses a placeholder email that is never mailed", () => {
    expect(telegramEmail(42)).toBe("tg42@telegram.intgetion.com");
    expect(isPlaceholderEmail("TG42@telegram.intgetion.com")).toBe(true);
    expect(isPlaceholderEmail("ann@example.com")).toBe(false);
  });
});
