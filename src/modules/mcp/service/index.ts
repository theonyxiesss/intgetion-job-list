/**
 * Public service surface of the MCP server (D480, D486).
 * Other modules may import only this file.
 */
export {
  MCP_MAX_BODY_BYTES,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  allowedHosts,
  allowedOrigins,
  handleMcpRequest,
} from "./server";
