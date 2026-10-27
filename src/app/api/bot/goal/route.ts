import { readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  goalSessionFromRequest,
  jobGoalActionInput,
  manageConversationJobGoal,
} from "@/modules/bot/service";
import { sessionCookie, sessionToken } from "../session-cookie";

/** Explicit controls for the current thread's bounded job-search goal. */
export async function POST(request: Request) {
  try {
    const input = await readJson(request, jobGoalActionInput);
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    const userId = user && user.status === "active" ? user.id : null;
    const result = await manageConversationJobGoal({
      userId,
      token: sessionToken(request),
      session: goalSessionFromRequest(request),
      locale: "en",
      action: input,
    });
    return Response.json(
      { goal: result.goal },
      {
        headers: {
          "cache-control": "no-store",
          "set-cookie": sessionCookie(result.token),
        },
      },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
