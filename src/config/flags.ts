function envFlag(name: string): boolean {
  return process.env[name] === "true";
}

/** Feature flags. Embeddings and live import stay off in MVP (D11, D18). */
export const flags = {
  embeddingsEnabled: envFlag("EMBEDDINGS_ENABLED"),
  importLiveEnabled: envFlag("IMPORT_LIVE_ENABLED"),
} as const;
