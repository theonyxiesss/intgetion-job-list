/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  listAudit,
  listSuggestions,
  listUsers,
  mapSuggestion,
  rejectSuggestion,
  suspendUser,
  unsuspendUser,
} from "./admin-service";
export type { AdminUserDto, AuditDto } from "./admin-service";
export {
  countPendingSkillSuggestions,
  listActiveSkills,
} from "@/modules/taxonomy/service";
export {
  listAuditQuery,
  listSuggestionsQuery,
  listUsersQuery,
  mapSuggestionInput,
  userActionInput,
} from "../schemas";
