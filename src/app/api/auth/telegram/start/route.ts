import { z } from "zod";
import { HttpError, readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { beginTelegramBotLogin, localeSchema } from "@/modules/auth/service";

const inputSchema = z.object({ locale: localeSchema });

/** Starts bot sign-in and returns a t.me link (D256). */
export async function POST(request: Request) {
  try {
    const input = await readJson(request, inputSchema);
    const ip = clientIp(request.headers);
    await enforceRateLimit("login", `${ip}|telegram`);
    const started = await beginTelegramBotLogin(input.locale);
    return Response.json(started);
  } catch (error) {
    if (error instanceof HttpError) return toErrorResponse(error);
    return toErrorResponse(
      new HttpError(502, "AUTH_PROVIDER_ERROR", "Auth provider error"),
    );
  }
}
