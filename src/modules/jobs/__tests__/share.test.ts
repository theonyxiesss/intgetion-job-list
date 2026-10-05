import { describe, expect, it } from "vitest";
import { shareUrl } from "../ui/share-job";

describe("job share links (D243)", () => {
  it("tags the channel so the own analytics shows it", () => {
    const url = new URL(
      shareUrl("https://intgetion.com/en/jobs/abc", "telegram"),
    );
    expect(url.pathname).toBe("/en/jobs/abc");
    expect(url.searchParams.get("utm_source")).toBe("share");
    expect(url.searchParams.get("utm_medium")).toBe("telegram");
  });
});
