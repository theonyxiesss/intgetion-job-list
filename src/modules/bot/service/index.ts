/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  BOT_SESSION_COOKIE,
  CONFIRMATION_TTL_MS,
  MAX_TOOL_ROUNDS,
  botLLM,
  confirmAction,
  conversationHistory,
  findOwnConversation,
  handleMessage,
  hashSessionToken,
  resolveConversation,
  resumeConversation,
  setBotLLMForTests,
  takeDraftOffer,
  startAtUser,
  toLLMMessages,
  type BotEvent,
} from "./conversation";
export {
  TOOLS,
  findTool,
  hashArgs,
  runTool,
  toolsFor,
  type BotState,
  type ToolContext,
} from "./tools";
export { postSystemEvent } from "./system-event";
