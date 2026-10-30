import { describe, expect, it } from "vitest";
import { videoEmbedUrl } from "../service/embed";

describe("video player address (U5, D577)", () => {
  it("builds the player for each allowed platform", () => {
    expect(
      videoEmbedUrl("https://www.tiktok.com/@a/video/7234567890123456789"),
    ).toBe("https://www.tiktok.com/embed/v2/7234567890123456789");
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbedUrl("https://www.instagram.com/reel/C8abc123XYZ/")).toBe(
      "https://www.instagram.com/reel/C8abc123XYZ/embed",
    );
  });

  it("gives no player for other hosts, plain http, or a bad id", () => {
    expect(videoEmbedUrl("https://example.com/video/1")).toBeNull();
    expect(
      videoEmbedUrl("http://www.tiktok.com/@a/video/123456789"),
    ).toBeNull();
    expect(
      videoEmbedUrl("https://www.youtube.com/watch?v=<script>"),
    ).toBeNull();
    expect(videoEmbedUrl("not a url")).toBeNull();
  });
});
