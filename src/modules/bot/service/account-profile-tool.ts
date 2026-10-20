import { z } from "zod";
import { HttpError, unauthenticated } from "@/lib/http";
import { isValidTimeZone } from "@/lib/tz";
import {
  patchSharedProfile,
  readSharedProfile,
  type SharedPatch,
} from "@/modules/users/service";
import type { BotTool, ToolContext } from "./tools";

/**
 * Spoki changes the shared "about me" profile (D505, 29.8): name, country,
 * city, time zone, languages, about. One card, then every role that exists
 * gets it, as from the account page. Contacts are not part of it.
 */

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "native"] as const;

const input = z
  .object({
    displayName: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    timezone: z.string().optional(),
    about: z.string().optional(),
    addLanguages: z
      .array(
        z
          .object({
            code: z.string(),
            level: z.enum(LEVELS).optional(),
          })
          .strict(),
      )
      .max(10)
      .optional(),
    removeLanguages: z.array(z.string()).max(10).optional(),
  })
  .strict();

type Input = z.infer<typeof input>;

function user(ctx: ToolContext): string {
  if (!ctx.userId) throw unauthenticated();
  return ctx.userId;
}

/** Plain words for the model: what to ask again. Nothing invalid is saved. */
function check(patch: Input): SharedPatch {
  const problems: string[] = [];
  const named = Object.entries(patch).filter(([, value]) =>
    Array.isArray(value) ? value.length > 0 : value?.trim(),
  );
  if (!named.length) problems.push("name what to change");
  if (patch.displayName !== undefined && patch.displayName.trim().length > 120)
    problems.push("displayName: at most 120 characters");
  if (
    patch.country !== undefined &&
    !/^[A-Za-z]{2}$/.test(patch.country.trim())
  )
    problems.push("country: a two-letter ISO code such as PL");
  if (patch.city !== undefined && patch.city.trim().length > 120)
    problems.push("city: at most 120 characters");
  if (patch.timezone !== undefined && !isValidTimeZone(patch.timezone.trim()))
    problems.push("timezone: an IANA zone such as Europe/Warsaw");
  if (patch.about !== undefined && patch.about.trim().length > 1000)
    problems.push("about: at most 1000 characters");
  for (const item of patch.addLanguages ?? [])
    if (!/^[A-Za-z]{2}$/.test(item.code.trim()))
      problems.push(`language ${item.code}: a two-letter code such as en`);
  if (problems.length)
    throw new HttpError(422, "VALIDATION_ERROR", problems.join("; "));
  return patch;
}

const tool = {
  name: "propose_account_update",
  description:
    "Change the person's own shared profile, used by every role (job seeker, employer, creator, freelancer): displayName, country (ISO-2), city, timezone (IANA), about, addLanguages ({code ISO-639-1, level A1-C2 or native}) and removeLanguages (codes). Send only what they asked to change, e.g. they moved, changed their name, learned a language. Confirmed on a card; contacts are not here.",
  input,
  access: "user",
  confirm: () => true,
  async preview(ctx: ToolContext, patch: Input) {
    check(patch);
    const current = await readSharedProfile(user(ctx));
    return current?.displayName ?? "";
  },
  async run(ctx: ToolContext, patch: Input) {
    const next = await patchSharedProfile(user(ctx), check(patch));
    return {
      llm: `Profile updated for every role. Now: ${JSON.stringify({
        country: next.country,
        city: next.city,
        timezone: next.timezone,
        languages: next.languages.map((item) =>
          item.level ? `${item.code} ${item.level}` : item.code,
        ),
      })}`,
    };
  },
};

export const accountProfileTools = [tool as unknown as BotTool];
