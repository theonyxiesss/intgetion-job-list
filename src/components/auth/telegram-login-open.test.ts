import { describe, expect, it, vi } from "vitest";
import { handoffTelegramLogin } from "./telegram-login-open";
import type { ReservedPopup } from "./mini-app-open";

function popup(): ReservedPopup & { replace: ReturnType<typeof vi.fn> } {
  const replace = vi.fn();
  return {
    replace,
    location: { replace },
    close: vi.fn(),
    closed: false,
    opener: {},
  };
}

describe("telegram login handoff", () => {
  it("sends the bot link to the window reserved before the request", () => {
    const reserved = popup();
    expect(
      handoffTelegramLogin(
        reserved,
        "https://t.me/intgetion_bot?start=login_x",
      ),
    ).toBe("popup");
    expect(reserved.replace).toHaveBeenCalledWith(
      "https://t.me/intgetion_bot?start=login_x",
    );
  });

  it("keeps this tab and asks for a link when the window was refused", () => {
    expect(
      handoffTelegramLogin(null, "https://t.me/intgetion_bot?start=login_x"),
    ).toBe("link");
  });

  it("falls back to a link when the reserved window rejects the address", () => {
    const reserved = popup();
    reserved.location.replace = () => {
      throw new Error("blocked");
    };
    expect(
      handoffTelegramLogin(
        reserved,
        "https://t.me/intgetion_bot?start=login_x",
      ),
    ).toBe("link");
    expect(reserved.close).toHaveBeenCalled();
  });
});
