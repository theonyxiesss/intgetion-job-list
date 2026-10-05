/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  analyticsReport,
  forgetVisitor,
  purgeAnalytics,
  trackPageView,
  trackServerEvent,
} from "./analytics-service";
export { VISITOR_COOKIE, VISITOR_MAX_AGE_SECONDS } from "../lib/events";
export { beaconInput, forgetInput } from "../schemas";
export type { AnalyticsReport } from "../repo/analytics-repo";
