import { protectedResourceMetadata } from "@/modules/mcp/service";

export function GET() {
  return Response.json(protectedResourceMetadata(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
