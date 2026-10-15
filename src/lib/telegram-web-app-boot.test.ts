import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
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

  it("keeps the same wait on the static menu page", () => {
    const html = fs.readFileSync(
      path.join(process.cwd(), "public/tg.html"),
      "utf8",
    );
    expect(html).toContain("w.ready()");
    expect(html).toContain("n++ >= 50");
  });
});
