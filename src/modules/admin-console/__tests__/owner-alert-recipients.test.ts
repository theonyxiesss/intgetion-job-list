import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listOwnerTelegramRecipients = vi.fn();
const firstOwnerLocale = vi.fn();

vi.mock("../repo/admin-console-repo", () => ({
  listOwnerTelegramRecipients: () => listOwnerTelegramRecipients(),
  firstOwnerLocale: () => firstOwnerLocale(),
}));
vi.mock("@/lib/supabase/admin", () => ({ getAuthUserEmail: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

import { ownerAlertRecipients } from "../service/console-service";

beforeEach(() => {
  listOwnerTelegramRecipients.mockReset().mockResolvedValue([]);
  firstOwnerLocale.mockReset().mockResolvedValue("ru");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ownerAlertRecipients (D607)", () => {
  it("is empty without linked owners and without the env id", async () => {
    vi.stubEnv("OWNER_ALERT_TELEGRAM_ID", "");
    expect(await ownerAlertRecipients()).toEqual([]);
  });

  it("uses owners with a linked Telegram in their own language", async () => {
    vi.stubEnv("OWNER_ALERT_TELEGRAM_ID", "");
    listOwnerTelegramRecipients.mockResolvedValue([
      { telegramId: "1001", locale: "de" },
    ]);
    expect(await ownerAlertRecipients()).toEqual([
      { chatId: 1001, locale: "de" },
    ]);
  });

  it("adds the env id in the first owner's language, once", async () => {
    vi.stubEnv("OWNER_ALERT_TELEGRAM_ID", " 555 ");
    expect(await ownerAlertRecipients()).toEqual([
      { chatId: 555, locale: "ru" },
    ]);
    listOwnerTelegramRecipients.mockResolvedValue([
      { telegramId: "555", locale: "en" },
    ]);
    expect(await ownerAlertRecipients()).toEqual([
      { chatId: 555, locale: "en" },
    ]);
  });

  it("ignores an env value that is not a chat id", async () => {
    vi.stubEnv("OWNER_ALERT_TELEGRAM_ID", "@founder");
    expect(await ownerAlertRecipients()).toEqual([]);
  });
});
