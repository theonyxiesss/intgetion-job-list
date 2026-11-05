import { oauthMetadata } from "@/modules/mcp/service";

export function GET() {
  return Response.json(oauthMetadata(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
