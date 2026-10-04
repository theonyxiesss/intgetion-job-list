import { z } from "zod";
import { readQuery, toErrorResponse, validationError } from "@/lib/http";
import { requireCandidate } from "@/lib/auth-guards";
import { hasCandidateProfile } from "@/modules/candidates/service";
import { getMatchFeed, InvalidCursorError } from "@/modules/matching/feed";
import { FEED_MAX_LIMIT, MATCH_TABS } from "@/modules/matching/service";

export const dynamic = "force-dynamic";

const query = z
  .object({
    tab: z.enum(MATCH_TABS).default("all"),
    cursor: z.string().max(64).optional(),
    limit: z.coerce.number().int().min(1).max(FEED_MAX_LIMIT).optional(),
    locale: z.enum(["en", "ru"]).optional(),
  })
  .strict();

/** Section 7: the candidate's matches, score ≥ 0.55 (D160). */
export async function GET(request: Request) {
  try {
    const user = await requireCandidate(hasCandidateProfile);
    const input = readQuery(request, query);
    const started = performance.now();
    const feed = await getMatchFeed(user.id, {
      tab: input.tab,
      cursor: input.cursor,
      limit: input.limit,
      locale: input.locale ?? user.locale,
    }).catch((error: unknown) => {
      if (error instanceof InvalidCursorError) {
        throw validationError("cursor is not valid");
      }
      throw error;
    });
    const serverMs = performance.now() - started;
    return Response.json(feed, {
      headers: {
        "Cache-Control": "private, no-store",
        "Server-Timing": `matches;dur=${serverMs.toFixed(1)}`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
