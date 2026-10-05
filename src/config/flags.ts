function envFlag(name: string): boolean {
  return process.env[name] === "true";
}

/** Feature flags. Embeddings and live import stay off in MVP (D11, D18). */
export const flags = {
  embeddingsEnabled: envFlag("EMBEDDINGS_ENABLED"),
  importLiveEnabled: envFlag("IMPORT_LIVE_ENABLED"),
  /**
   * Sign-in and linking through the Telegram widget (D217, D230). Frozen
   * while a new Telegram sign-in is built (D246): on only with
   * TELEGRAM_LOGIN_ENABLED=true.
   */
  telegramLoginEnabled: envFlag("TELEGRAM_LOGIN_ENABLED"),
  /**
   * The site may be opened as a Telegram Mini App (D259). Off by default: it
   * lets Telegram Web show the site in a frame, so it is turned on only once
   * the Mini App is actually set up in BotFather.
   */
  telegramMiniAppEnabled: envFlag("TELEGRAM_MINI_APP_ENABLED"),
} as const;
