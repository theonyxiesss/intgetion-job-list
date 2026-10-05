import { z } from "zod";

/** At most this many saved searches per user (D233). */
export const SAVED_SEARCH_LIMIT = 10;

/** `POST /api/saved-searches` — the catalog query string and a name. */
export const createSavedSearchInput = z
  .object({
    query: z.string().min(1).max(1000),
    name: z.string().trim().min(1).max(80),
  })
  .strict();
export type CreateSavedSearchInput = z.infer<typeof createSavedSearchInput>;

/** `PATCH /api/saved-searches/:id` — turn the daily alert on or off. */
export const patchSavedSearchInput = z.object({ alert: z.boolean() }).strict();
