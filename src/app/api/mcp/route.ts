import { handleMcpOAuthRequest, handleMcpRequest } from "@/modules/mcp/service";

/**
 * `/api/mcp` — MCP over stateless Streamable HTTP. OAuth endpoints share this
 * path so server-to-server token requests pass the exact route Origin policy.
 */
export const maxDuration = 30;

export async function POST(request: Request) {
  const oauth = await handleMcpOAuthRequest(request);
  if (oauth) return oauth;
  return handleMcpRequest(request);
}

export async function GET(request: Request) {
  const oauth = await handleMcpOAuthRequest(request);
  if (oauth) return oauth;
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}
