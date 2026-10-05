import { z } from "zod";
import { readJson, toErrorResponse } from "@/lib/http";
import { confirmEmailAdd } from "@/modules/auth/service";

const confirmInput = z.object({ token: z.string().min(1).max(2000) }).strict();

/**
 * The button on the confirmation page (D231). A plain GET of the mailed
 * link changes nothing, so mail scanners that open links confirm nothing.
 */
export async function POST(request: Request) {
  try {
    const { token } = await readJson(request, confirmInput);
    return Response.json(await confirmEmailAdd(token));
  } catch (error) {
    return toErrorResponse(error);
  }
}
