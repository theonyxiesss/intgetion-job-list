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
export {
  MCP_SCOPES,
  approveMcpAuthorization,
  createMcpAuthorizationRequest,
  createMcpPersonalToken,
  declineMcpAuthorization,
  enforceMcpUserLimit,
  exchangeMcpCode,
  getMcpAuthorizationRequest,
  getMcpClient,
  isValidMcpResource,
  listMcpConnections,
  listMcpPersonalTokens,
  refreshMcpToken,
  registerMcpClient,
  resolveMcpClient,
  revokeMcpConnection,
  revokeMcpPersonalToken,
  revokeMcpToken,
  verifyMcpToken,
  type McpPrincipal,
  type McpScope,
} from "./auth-service";
export {
  fetchCimdDocument,
  validateCimdDocument,
  validateCimdUrl,
} from "./cimd";
export { userMcpTools, runUserMcpTool } from "./user-tools";
export {
  handleMcpOAuthRequest,
  mcpAuthorizationCookieName,
  oauthMetadata,
  protectedResourceMetadata,
} from "./oauth-http";
