import { ImageResponse } from "next/og";
import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OG_TEXT } from "@/modules/seo/og";

/** The picture shown when a page of the site is shared (D278). */
export const alt = OG_TEXT.alt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: OG_COLORS.background,
        color: OG_COLORS.foreground,
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontSize: 112,
            letterSpacing: -2,
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          {OG_TEXT.wordmark}
        </div>
        <div
          style={{
            fontSize: 40,
            letterSpacing: 12,
            color: OG_COLORS.signal,
          }}
        >
          {OG_TEXT.sub}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          borderTop: `2px solid ${OG_COLORS.line}`,
          paddingTop: 32,
        }}
      >
        <div style={{ fontSize: 48, lineHeight: 1.2 }}>{OG_TEXT.tagline}</div>
        <div style={{ fontSize: 30, color: OG_COLORS.muted }}>
          {OG_TEXT.domain}
        </div>
      </div>
    </div>,
    size,
  );
}
