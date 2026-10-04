import { z } from "zod";

/** `DELETE /api/me` — the user types DELETE to confirm (D28). */
export const deleteAccountInput = z
  .object({ confirm: z.literal("DELETE") })
  .strict();
