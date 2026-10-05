/**
 * Palette and wording for generated social images (D278). Plain hex, because
 * the image is drawn on the server and cannot read CSS variables; the values
 * mirror the dark theme tokens in globals.css.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export const OG_COLORS = {
  background: "#000000",
  foreground: "#f5f5f5",
  muted: "#a1a1aa",
  line: "#26262a",
  signal: "#5b8cff",
} as const;

/** Latin only: the image is drawn with the built-in font (D278). */
export const OG_TEXT = {
  wordmark: "INTGETION",
  sub: "JOB LIST",
  tagline: "Remote jobs in Web3 and crypto",
  domain: "intgetion.com",
  alt: "INTGETION Job List — remote jobs in Web3 and crypto",
} as const;
