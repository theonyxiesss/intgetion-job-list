import { z } from "zod";
import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { siteUrl } from "@/lib/supabase/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createMcpPersonalToken,
  listMcpPersonalTokens,
  revokeMcpPersonalToken,
} from "@/modules/mcp/service";

const createInput = z
  .object({
    label: z.string().trim().min(1).max(80),
    scopes: z.array(z.string()).min(1),
  })
  .strict();
const deleteInput = z.object({ id: z.uuid() }).strict();

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(
      { tokens: await listMcpPersonalTokens(user.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit("mcpPersonalToken", user.id);
    const input = await readJson(request, createInput);
    const result = await createMcpPersonalToken({
      userId: user.id,
      ...input,
      resource: `${siteUrl()}/api/mcp`,
    });
    return Response.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, deleteInput);
    const revoked = await revokeMcpPersonalToken(user.id, input.id);
    return Response.json({ revoked });
  } catch (error) {
    return toErrorResponse(error);
  }
}
