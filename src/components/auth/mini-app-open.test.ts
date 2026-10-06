import { describe, expect, it, vi } from "vitest";
import {
  deliverHandoffUrl,
  handoffNeedsCopy,
  isOwnHandoffUrl,
  needsPartitionedSession,
  readTelegramInitData,
  type ReservedPopup,
} from "./mini-app-open";

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

describe("handoff out of the Mini App (D318)", () => {
  it("sends a desktop click to the window reserved before the request", () => {
    const reserved = popup();
    const result = deliverHandoffUrl("https://intgetion.com/en/auth/callback", {
      popup: reserved,
      webView: false,
    });
    expect(result.reveal).toBe(false);
    expect(reserved.replace).toHaveBeenCalledWith(
      "https://intgetion.com/en/auth/callback",
    );
  });

  it("reveals the address when the browser refused the window", () => {
    expect(
      deliverHandoffUrl("https://intgetion.com/en/auth/callback", {
        popup: null,
        webView: false,
      }).reveal,
    ).toBe(true);
  });

  it("does not trust a window inside a phone webview", () => {
    const reserved = popup();
    const result = deliverHandoffUrl("https://intgetion.com/ru/auth/callback", {
      popup: reserved,
      webView: true,
    });
    expect(result.reveal).toBe(true);
    expect(reserved.close).toHaveBeenCalled();
    expect(reserved.replace).not.toHaveBeenCalled();
  });

  it("uses Telegram's external opener and hides the address", () => {
    const reserved = popup();
    const openExternal = vi.fn();
    const result = deliverHandoffUrl("https://intgetion.com/en/auth/callback", {
      popup: reserved,
      openExternal,
      webView: true,
    });
    expect(result.reveal).toBe(false);
    expect(openExternal).toHaveBeenCalledWith(
      "https://intgetion.com/en/auth/callback",
    );
    expect(reserved.close).toHaveBeenCalled();
  });

  it("reveals the address when the external opener throws", () => {
    const result = deliverHandoffUrl("https://intgetion.com/en/auth/callback", {
      popup: null,
      openExternal: () => {
        throw new Error("blocked");
      },
      webView: true,
    });
    expect(result.reveal).toBe(true);
  });

  it("treats phones as webviews and a desktop browser as a real window", () => {
    expect(handoffNeedsCopy("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(
      true,
    );
    expect(handoffNeedsCopy("Mozilla/5.0 (Linux; Android 14)")).toBe(true);
    expect(
      handoffNeedsCopy("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"),
    ).toBe(false);
    expect(handoffNeedsCopy("TelegramDesktop/5.0")).toBe(true);
  });

  it("accepts only this site's callback", () => {
    expect(
      isOwnHandoffUrl(
        "https://intgetion.com/en/auth/callback?token_hash=abc",
        "https://intgetion.com",
      ),
    ).toBe(true);
    expect(
      isOwnHandoffUrl(
        "https://evil.example/en/auth/callback",
        "https://intgetion.com",
      ),
    ).toBe(false);
    expect(isOwnHandoffUrl("not a url", "https://intgetion.com")).toBe(false);
  });

  it("uses Partitioned cookies only inside web.telegram.org", () => {
    const top = { parent: null as unknown };
    top.parent = top;
    expect(needsPartitionedSession(top)).toBe(false);
    expect(
      needsPartitionedSession({
        parent: top,
        document: { referrer: "https://web.telegram.org/k/" },
      }),
    ).toBe(true);
    // Phone webview that wraps the page in an iframe is not Telegram Web.
    expect(
      needsPartitionedSession({
        parent: top,
        document: { referrer: "" },
        location: { ancestorOrigins: [] },
      }),
    ).toBe(false);
  });

  it("reads the signed payload the way Telegram's own script does", () => {
    expect(
      readTelegramInitData({
        hash: "#tgWebAppData=signed&tgWebAppVersion=7",
        injected: "other",
      }),
    ).toBe("signed");
    expect(
      readTelegramInitData({
        hash: "#/?tgWebAppData=signed&tgWebAppVersion=7",
      }),
    ).toBe("signed");
    expect(
      readTelegramInitData({
        hash: "#/en?tgWebAppData=user%3D1%26hash%3Dabc&tgWebAppVersion=8",
      }),
    ).toBe("user=1&hash=abc");
    expect(
      readTelegramInitData({
        hash: "",
        storedHash: "#tgWebAppData=from-store&tgWebAppVersion=7",
      }),
    ).toBe("from-store");
    expect(readTelegramInitData({ hash: "", injected: " kept " })).toBe("kept");
    expect(readTelegramInitData({ hash: "#tgWebAppVersion=7" })).toBeNull();
  });
});
