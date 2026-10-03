/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  listAudit,
  listCompanies,
  listSuggestions,
  listUsers,
  mapSuggestion,
  rejectSuggestion,
  suspendCompany,
  suspendUser,
  unsuspendCompany,
  unsuspendUser,
} from "./admin-service";
export type { AdminCompanyDto, AdminUserDto, AuditDto } from "./admin-service";
export {
  countPendingSkillSuggestions,
  listActiveSkills,
} from "@/modules/taxonomy/service";
export {
  listAuditQuery,
  listCompaniesQuery,
  listSuggestionsQuery,
  listUsersQuery,
  mapSuggestionInput,
  userActionInput,
} from "../schemas";
