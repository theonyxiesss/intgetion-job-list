/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  ALERT_MAX_JOBS,
  deleteSavedSearch,
  listSavedSearches,
  normalizeQuery,
  runSearchAlerts,
  saveSearch,
  setSearchAlert,
  type AlertJob,
} from "./saved-searches-service";
export {
  SAVED_SEARCH_LIMIT,
  createSavedSearchInput,
  patchSavedSearchInput,
} from "../schemas";
export type { SavedSearch } from "../repo/saved-searches";
