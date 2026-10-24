function envFlag(name: string): boolean {
  return process.env[name] === "true";
}

/** Feature flags. Embeddings stay off (D11). Live import runs only when IMPORT_LIVE_ENABLED=true (D18, D375). */
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
  /**
   * The persistent Spoki panel in the layout (D525). Off until tested: with
   * SPOKI_DOCK=true the chat lives beside every page and `/chat` is its
   * full screen.
   */
  spokiDockEnabled: envFlag("SPOKI_DOCK"),
  /**
   * Spoki interactive blocks (D523): cards, plans, calculators, choices.
   * Off until tested; the bot reads it per turn (`interactiveUiOn`).
   */
  spokiInteractiveUiEnabled: envFlag("SPOKI_INTERACTIVE_UI"),
} as const;
