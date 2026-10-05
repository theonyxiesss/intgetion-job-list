import { describe, expect, it } from "vitest";
import { resolveDelivery } from "../lib/catalog";
import { telegramText } from "../service/render";

describe("Telegram notifications (D236, D237)", () => {
  it("renders the in-app text with a link to the right page", () => {
    const text = telegramText({
      locale: "ru",
      type: "search.alert",
      payload: { searchName: "Rust", matchCount: 3 },
      siteUrl: "https://intgetion.com",
    });
    expect(text).toContain("«Rust»");
    expect(text).toContain("3");
    expect(text).toMatch(/https:\/\/intgetion\.com\/ru\/saved-searches$/);
  });

  it("follows the email default unless the user decided", () => {
    expect(resolveDelivery("matches.digest", "telegram", []).allowed).toBe(
      true,
    );
    expect(resolveDelivery("job.closed", "telegram", []).allowed).toBe(false);
    expect(
      resolveDelivery("matches.digest", "telegram", [
        { type: "matches.digest", channel: "telegram", enabled: false },
      ]).allowed,
    ).toBe(false);
  });
});
