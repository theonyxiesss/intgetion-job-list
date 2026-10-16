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
  chatActions,
  findConfirmationConversation,
  findOwnConversation,
  handleMessage,
  openFreelanceConversation,
  pendingConfirmations,
  readFreelanceFocus,
  hashSessionToken,
  openServiceConversation,
  openUgcHomeConversation,
  openUgcThread,
  resolveConversation,
  resumeConversation,
  setBotLLMForTests,
  setFillMode,
  takeDraftOffer,
  startAtUser,
  toLLMMessages,
  type BotEvent,
  type ChatActions,
} from "./conversation";
export {
  TOOLS,
  findTool,
  hashArgs,
  runTool,
  toolNeedsConfirmation,
  toolsFor,
  type BotState,
  type ToolContext,
} from "./tools";
export { postSystemEvent } from "./system-event";
export { handleTelegramAgentUpdate } from "./telegram-agent";
export { offerUgcNextStep, ugcNextLine } from "./ugc-next";
export type { UgcNextLink } from "./ugc-next";
