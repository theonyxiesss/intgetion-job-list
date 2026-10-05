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
} as const;
