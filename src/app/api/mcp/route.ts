import { handleMcpRequest } from "@/modules/mcp/service";

/**
 * `/api/mcp` — MCP over stateless Streamable HTTP (D486). Public reads only.
 * GET and DELETE are answered by the SDK (405: there are no sessions).
 */
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}
