/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  FIXTURE_ADAPTERS,
  runFixtureImport,
  runFixtureImports,
} from "./ingest-fixtures";
export type { ImportReport } from "./ingest-fixtures";
export { applyExternal, recordNothing } from "./apply-external";
export type { ExternalApplyRecorder } from "./apply-external";
