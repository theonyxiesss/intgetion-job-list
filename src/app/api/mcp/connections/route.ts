import { z } from "zod";
import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { listMcpConnections, revokeMcpConnection } from "@/modules/mcp/service";

const deleteInput = z.object({ id: z.uuid() }).strict();

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(
      { connections: await listMcpConnections(user.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, deleteInput);
    const revoked = await revokeMcpConnection(user.id, input.id);
    return Response.json({ revoked });
  } catch (error) {
    return toErrorResponse(error);
  }
}
