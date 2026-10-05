/** Content-Security-Policy for pages (section 16.1), one nonce per request. */
export function buildCsp({
  nonce,
  supabaseUrl,
  isDev,
  includeSupabase = true,
  allowTelegramFrame = false,
}: {
  nonce: string;
  supabaseUrl: string;
  isDev: boolean;
  includeSupabase?: boolean;
  /** Telegram Web shows a Mini App in a frame, so it must be allowed (D259). */
  allowTelegramFrame?: boolean;
}): string {
  const supabase = new URL(supabaseUrl).origin;
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: ${supabase}`,
    "font-src 'self'",
    `connect-src 'self'${includeSupabase ? ` ${supabase}` : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    allowTelegramFrame
      ? "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org"
      : "frame-ancestors 'none'",
  ].join("; ");
}

export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Headers for every response, set in next.config.ts. X-Frame-Options is the
 * old, all-or-nothing version of frame-ancestors; with the Mini App on, the
 * CSP above decides instead, so the blunt header is left out (D259).
 */
export const staticSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  ...(process.env.TELEGRAM_MINI_APP_ENABLED === "true"
    ? []
    : [{ key: "X-Frame-Options", value: "DENY" }]),
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

/** JSON responses never load anything. */
export const apiCsp = "default-src 'none'; frame-ancestors 'none'";
