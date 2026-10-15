import { describe, expect, it } from "vitest";
import { telegramWaitPurpose } from "./telegram-login-wait";

describe("telegram wait cookie", () => {
  it("reads the purpose and ignores other cookies", () => {
    expect(telegramWaitPurpose("")).toBeNull();
    expect(telegramWaitPurpose("tg_wait=nope")).toBeNull();
    expect(telegramWaitPurpose("theme=dark; tg_wait=signin")).toBe("signin");
    expect(telegramWaitPurpose("tg_wait=link; other=1")).toBe("link");
  });
});
