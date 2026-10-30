import { isEmbeddedOrigin } from "./embedded-sites";

/**
 * Relay, verify, WalletConnect RPC, and the AppKit wallet list.
 * Pay page only (D403, D406). Telemetry (pulse) stays off.
 */
const WALLETCONNECT_CONNECT = [
  "wss://relay.walletconnect.org",
  "https://verify.walletconnect.org",
  "https://verify.walletconnect.com",
  "https://rpc.walletconnect.org",
  "https://api.web3modal.org",
  "https://secure.walletconnect.org",
] as const;

/**
 * AppKit appends its theme <style> tags without our nonce. A browser ignores
 * 'unsafe-inline' when a nonce is in the same list, so the pay page drops the
 * style nonce (D406, D420). script-src keeps its nonce.
 */
/** Players of the three platforms a creator can link (D578). Room page only. */
const VIDEO_EMBED_FRAMES = [
  "https://www.tiktok.com",
  "https://www.instagram.com",
  "https://www.youtube-nocookie.com",
];
const WALLETCONNECT_STYLE = "'unsafe-inline'";

/**
 * Modal font and wallet icons. Pay page only (D406). AppKit fetches each
 * wallet icon and shows it as a blob: URL, so blob: is needed too (D422).
 */
const WALLETCONNECT_FONT = "https://fonts.reown.com";
const WALLETCONNECT_IMG = [
  "blob:",
  "https://api.web3modal.org",
  "https://walletconnect.org",
] as const;

/** Attestation runs in a hidden frame on the verify host (D403). */
const WALLETCONNECT_FRAME = [
  "https://verify.walletconnect.org",
  "https://verify.walletconnect.com",
] as const;

/** Official Mini App bridge. Phone clients often expose initData only through it (D324). */
export const TELEGRAM_WEB_APP_SCRIPT =
  "https://telegram.org/js/telegram-web-app.js";

/** Content-Security-Policy for pages (section 16.1), one nonce per request. */
export function buildCsp({
  nonce,
  supabaseUrl,
  isDev,
  includeSupabase = true,
  allowTelegramFrame = false,
  embedOrigin,
  allowWalletConnect = false,
  allowVideoEmbeds = false,
}: {
  nonce: string;
  supabaseUrl: string;
  isDev: boolean;
  includeSupabase?: boolean;
  /** Telegram Web shows a Mini App in a frame, so it must be allowed (D259). */
  allowTelegramFrame?: boolean;
  /** A foreign origin is framed only when it is still allowlisted. None are (D400). */
  embedOrigin?: string;
  /** Relay, verify, and the AppKit modal, only on the crypto pay page (D403, D406). */
  allowWalletConnect?: boolean;
  allowVideoEmbeds?: boolean;
}): string {
  const supabase = new URL(supabaseUrl).origin;
  // Phone Mini Apps need telegram-web-app.js; Desktop often injects initData
  // without it. Host allowlist only when the Mini App flag opens framing (D324).
  const scriptSrc = allowTelegramFrame
    ? `script-src 'self' 'nonce-${nonce}' https://telegram.org${isDev ? " 'unsafe-eval'" : ""}`
    : `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`;
  const styleSrc = allowWalletConnect
    ? `style-src 'self' ${WALLETCONNECT_STYLE}`
    : `style-src 'self' 'nonce-${nonce}'`;
  const imgSrc = [
    "img-src 'self' data:",
    supabase,
    ...(allowWalletConnect ? WALLETCONNECT_IMG : []),
  ].join(" ");
  const fontSrc = allowWalletConnect
    ? `font-src 'self' ${WALLETCONNECT_FONT}`
    : "font-src 'self'";
  const connectSrc = [
    "'self'",
    ...(includeSupabase ? [supabase] : []),
    ...(allowWalletConnect ? WALLETCONNECT_CONNECT : []),
  ].join(" ");
  const frameSrc = [
    ...(embedOrigin && isEmbeddedOrigin(embedOrigin)
      ? ["'self'", embedOrigin]
      : []),
    ...(allowWalletConnect ? WALLETCONNECT_FRAME : []),
    ...(allowVideoEmbeds ? VIDEO_EMBED_FRAMES : []),
  ];
  return [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    imgSrc,
    fontSrc,
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    allowTelegramFrame
      ? "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org"
      : "frame-ancestors 'none'",
    // Other pages stay on default-src 'self', so they cannot frame a foreign site.
    ...(frameSrc.length > 0 ? [`frame-src ${frameSrc.join(" ")}`] : []),
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
