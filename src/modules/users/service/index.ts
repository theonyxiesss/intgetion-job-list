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
} from "./shared-profile";
export type {
  NoteMode,
  SharedFacts,
  SharedLanguage,
  SharedProfile,
} from "./shared-profile";
