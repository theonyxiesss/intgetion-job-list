import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  miniAppContinuePath,
  miniAppSignedInHtml,
  TELEGRAM_MINI_APP_BOUNCE_SCRIPT,
  TELEGRAM_WEB_APP_BOOT_SCRIPT,
} from "./telegram-web-app-boot";

describe("telegram web app boot", () => {
  it("calls ready and does not leave the first document", () => {
    expect(TELEGRAM_WEB_APP_BOOT_SCRIPT).toContain("w.ready()");
    expect(TELEGRAM_WEB_APP_BOOT_SCRIPT).not.toContain("location.replace");
    expect(TELEGRAM_WEB_APP_BOOT_SCRIPT).toContain("n<50");
  });

  it("waits up to five seconds before the bounce leaves", () => {
    expect(TELEGRAM_MINI_APP_BOUNCE_SCRIPT).toContain("w.ready()");
    expect(TELEGRAM_MINI_APP_BOUNCE_SCRIPT).toContain("n++>=50");
    expect(TELEGRAM_MINI_APP_BOUNCE_SCRIPT).toContain("location.replace");
  });

  it("signs in on the first Telegram document before navigating", () => {
    expect(TELEGRAM_MINI_APP_BOUNCE_SCRIPT).toContain(
      'f.action="/api/auth/telegram/miniapp"',
    );
    expect(TELEGRAM_MINI_APP_BOUNCE_SCRIPT).toContain('f.method="POST"');
    expect(TELEGRAM_MINI_APP_BOUNCE_SCRIPT).toContain("tg_mini_try_");
    expect(TELEGRAM_MINI_APP_BOUNCE_SCRIPT).toContain("used>=2");
    expect(TELEGRAM_MINI_APP_BOUNCE_SCRIPT).not.toContain("tg_mini_post");
    expect(() => new Function(TELEGRAM_MINI_APP_BOUNCE_SCRIPT)).not.toThrow();
    expect(miniAppContinuePath("en")).toBe("/?tgb=1");
    expect(miniAppContinuePath("ru")).toBe("/ru?tgb=1");
    expect(miniAppSignedInHtml("/?tgb=1")).toContain('content="0;url=/?tgb=1"');
    expect(miniAppSignedInHtml("/ru?tgb=1")).toContain(
      'content="0;url=/ru?tgb=1"',
    );
    expect(miniAppSignedInHtml("https://evil.example")).toContain(
      'content="0;url=/?tgb=1"',
    );
    expect(miniAppSignedInHtml("/?tgb=1")).not.toContain("initData");
  });

  it("keeps the same wait on the static menu page", () => {
    const html = fs.readFileSync(
      path.join(process.cwd(), "public/tg.html"),
      "utf8",
    );
    expect(html).toContain("w.ready()");
    expect(html).toContain("n++ >= 50");
    expect(html).toContain('f.action = "/api/auth/telegram/miniapp"');
    expect(html).toContain("tg_mini_try_");
    expect(html).toContain("used >= 2");
  });
});
