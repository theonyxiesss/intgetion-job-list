/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  FOLLOW_LIMIT,
  countFollowers,
  followCompany,
  isFollowing,
  listFollows,
  runCompanyAlerts,
  unfollowCompany,
  type CompanyAlertJob,
} from "./follows-service";
export type { Follow } from "../repo/follows";
