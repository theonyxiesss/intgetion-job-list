/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  EMPTY_PROFILE,
  exportSharedProfile,
  mergeSharedFacts,
  noteSharedProfile,
  readSharedProfile,
  updateSharedProfile,
} from "./shared-profile";
export {
  SHARED_LANGUAGE_LEVELS,
  sharedProfileInput,
  type SharedProfileInput,
} from "../schemas";
export type {
  NoteMode,
  SharedFacts,
  SharedLanguage,
  SharedProfile,
} from "./shared-profile";
